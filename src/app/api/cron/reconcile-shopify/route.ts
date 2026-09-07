import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuth } from "@/lib/api-auth";
import { fetchAllShopifyProducts, shopifyConfigured } from "@/lib/shopify";
import { upsertShopifyMirror } from "@/lib/shopify-sync";
import { notifyTeam } from "@/lib/email";

export const maxDuration = 120;

/**
 * Diário 6h05 — confere se algum webhook se perdeu (regra do desenho, seção 3). Silencioso se
 * não achar divergência. Se falhar (ex.: token da Shopify expirou/foi revogado), avisa a equipe —
 * sem isso o dado comercial (preço/estoque) para de atualizar sem ninguém perceber.
 */
export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await shopifyConfigured())) return NextResponse.json({ ok: false, skipped: "Shopify não configurada" });

  try {
    const products = await fetchAllShopifyProducts();
    for (const p of products) await upsertShopifyMirror(p, "SHOPIFY");
    return NextResponse.json({ ok: true, reconciled: products.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await notifyTeam("Sincronização com a Shopify falhou", `A reconciliação diária com a Shopify (reconcile-shopify) falhou hoje:\n\n${msg}\n\nMotivo comum: o token de acesso expirou ou foi revogado — pode ser preciso reconectar a loja em Configurações. Até corrigir, preço/estoque não atualizam.`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
