import crypto from "crypto";

const API_VERSION = "2025-01";

function storeUrl(path: string): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("SHOPIFY_STORE_DOMAIN não configurado");
  return `https://${domain}/admin/api/${API_VERSION}${path}`;
}

function headers(): Record<string, string> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN não configurado");
  return { "X-Shopify-Access-Token": token, "Content-Type": "application/json" };
}

export function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
}

/**
 * Verifica o HMAC de um webhook da Shopify (header X-Shopify-Hmac-Sha256, base64,
 * calculado sobre o corpo bruto com o "signing secret" do app customizado). Fail-closed:
 * sem SHOPIFY_WEBHOOK_SECRET, rejeita tudo.
 */
export function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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
  let url: string | null = storeUrl("/products.json?limit=250");
  while (url) {
    const res: Response = await fetch(url, { headers: headers() });
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
  const res = await fetch(storeUrl(`/products/${id}.json`), { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { product: ShopifyProduct };
  return json.product;
}

/** Registra os 3 webhooks que o Guardião precisa (products/create, update, delete). Idempotente. */
export async function registerShopifyWebhooks(callbackBaseUrl: string) {
  const topics = ["products/create", "products/update", "products/delete"];
  const results: { topic: string; ok: boolean; detail: string }[] = [];
  for (const topic of topics) {
    const res = await fetch(storeUrl("/webhooks.json"), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ webhook: { topic, address: `${callbackBaseUrl}/api/webhooks/shopify`, format: "json" } }),
    });
    const body = await res.json().catch(() => ({}));
    results.push({ topic, ok: res.ok, detail: res.ok ? "criado" : JSON.stringify(body) });
  }
  return results;
}
