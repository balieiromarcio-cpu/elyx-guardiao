import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthCallback, exchangeCodeForToken, saveShopifyConnection } from "@/lib/shopify";
import { logChange } from "@/lib/versioning";

/**
 * Callback da instalação OAuth da Shopify (registrado como "URL de redirecionamento
 * permitida" no Dev Dashboard). A loja parou de emitir token estático pra app customizado
 * — instalar sempre passa por aqui: Shopify manda ?shop&code&hmac, a gente verifica o HMAC,
 * troca o código pelo token e guarda em ShopifyConnection. Sem sessão própria exigida: a
 * prova de quem instalou é o HMAC + code válidos da própria Shopify.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const shop = params.get("shop");
  const code = params.get("code");

  if (!shop || !code) {
    return NextResponse.json({ error: "faltou shop ou code na URL de callback" }, { status: 400 });
  }
  if (!verifyOAuthCallback(params)) {
    return NextResponse.json({ error: "HMAC inválido — esse callback não veio da Shopify" }, { status: 401 });
  }

  try {
    const { access_token, scope } = await exchangeCodeForToken(shop, code);
    await saveShopifyConnection(shop, access_token, scope);
    await logChange({ entity: "ShopifyConnection", entityId: "default", field: "conectado", oldValue: null, newValue: shop, origin: "SYSTEM" });
    return NextResponse.redirect(new URL("/dashboard/configuracoes?ok=" + encodeURIComponent(`Shopify conectada: ${shop}`), req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(new URL("/dashboard/configuracoes?erro=" + encodeURIComponent(`Falha ao conectar Shopify: ${msg}`), req.url));
  }
}
