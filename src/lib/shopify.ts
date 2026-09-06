import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const API_VERSION = "2025-01";

/**
 * A loja da Élyx parou de oferecer token estático de app customizado (06/09/2026) — só
 * instala trocando código por token (OAuth padrão), mesmo em app criado como "legado" no
 * Dev Dashboard. Por isso a conexão vive no banco (ShopifyConnection), não em env var: só
 * existe depois que alguém clica "Instalar app" na Shopify e o callback grava o token.
 * SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_ACCESS_TOKEN em env continuam funcionando como
 * fallback manual, caso algum dia a Shopify volte a emitir token direto.
 */
async function getConnection() {
  return prisma.shopifyConnection.findUnique({ where: { id: "default" } });
}

async function storeDomain(): Promise<string> {
  const conn = await getConnection();
  const domain = conn?.shop ?? process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("Shopify não conectada — instale o app pela Shopify ou configure SHOPIFY_STORE_DOMAIN");
  return domain;
}

async function storeUrl(path: string): Promise<string> {
  return `https://${await storeDomain()}/admin/api/${API_VERSION}${path}`;
}

async function headers(): Promise<Record<string, string>> {
  const conn = await getConnection();
  const token = conn?.accessToken ?? process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("Shopify não conectada — instale o app pela Shopify ou configure SHOPIFY_ADMIN_ACCESS_TOKEN");
  return { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };
}

export async function shopifyConfigured(): Promise<boolean> {
  const conn = await getConnection();
  if (conn) return true;
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

export async function shopifyConnectionInfo() {
  const conn = await getConnection();
  if (conn) return { shop: conn.shop, via: "oauth" as const, installedAt: conn.installedAt };
  if (process.env.SHOPIFY_STORE_DOMAIN) return { shop: process.env.SHOPIFY_STORE_DOMAIN, via: "env" as const, installedAt: null };
  return null;
}

/**
 * Verifica o HMAC de um webhook da Shopify (header X-Shopify-Hmac-Sha256, base64,
 * calculado sobre o corpo bruto com o Client Secret do app). Fail-closed: sem
 * SHOPIFY_API_SECRET no ambiente, rejeita tudo.
 */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Verifica o HMAC da query string do callback OAuth (parâmetros ordenados, sem o próprio
 * "hmac", juntos com "&", comparado ao Client Secret). Regra da Shopify pra confirmar que o
 * redirect realmente veio da Shopify antes de trocar o código por token.
 */
export function verifyOAuthCallback(params: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = params.get("hmac");
  if (!secret || !hmac) return false;
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const digest = crypto.createHmac("sha256", secret).update(pairs.join("&")).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmac);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Troca o código de autorização pelo token de acesso — último passo da instalação OAuth. */
export async function exchangeCodeForToken(shop: string, code: string): Promise<{ access_token: string; scope: string }> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!clientId || !clientSecret) throw new Error("SHOPIFY_API_KEY/SHOPIFY_API_SECRET não configurados na Vercel");
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!res.ok) throw new Error(`Shopify OAuth ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function saveShopifyConnection(shop: string, accessToken: string, scope: string) {
  return prisma.shopifyConnection.upsert({
    where: { id: "default" },
    update: { shop, accessToken, scope, updatedAt: new Date() },
    create: { id: "default", shop, accessToken, scope },
  });
}

export type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: { id: number; title: string; price: string; compare_at_price: string | null; sku: string | null; inventory_quantity?: number }[];
  images: { id: number; src: string }[];
};

/** Lista todos os produtos da loja (paginado por link header) — usado na importação inicial e na reconciliação diária. */
export async function fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
  const out: ShopifyProduct[] = [];
  let url: string | null = await storeUrl("/products.json?limit=250");
  const h = await headers();
  while (url) {
    const res: Response = await fetch(url, { headers: h });
    if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { products: ShopifyProduct[] };
    out.push(...json.products);
    const link = res.headers.get("link");
    const next = link?.split(",").find((s) => s.includes('rel="next"'));
    const match = next?.match(/<([^>]+)>/);
    url = match ? match[1] : null;
  }
  return out;
}

export async function fetchShopifyProduct(id: string | number): Promise<ShopifyProduct | null> {
  const res = await fetch(await storeUrl(`/products/${id}.json`), { headers: await headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { product: ShopifyProduct };
  return json.product;
}

/** Registra os 3 webhooks que o Guardião precisa (products/create, update, delete). Idempotente. */
export async function registerShopifyWebhooks(callbackBaseUrl: string) {
  const topics = ["products/create", "products/update", "products/delete"];
  const results: { topic: string; ok: boolean; detail: string }[] = [];
  const h = await headers();
  const url = await storeUrl("/webhooks.json");
  for (const topic of topics) {
    const res = await fetch(url, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ webhook: { topic, address: `${callbackBaseUrl}/api/webhooks/shopify`, format: "json" } }),
    });
    const body = await res.json().catch(() => ({}));
    results.push({ topic, ok: res.ok, detail: res.ok ? "criado" : JSON.stringify(body) });
  }
  return results;
}
