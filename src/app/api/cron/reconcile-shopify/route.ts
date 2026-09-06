import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuth } from "@/lib/api-auth";
import { fetchAllShopifyProducts, shopifyConfigured } from "@/lib/shopify";
import { upsertShopifyMirror } from "@/lib/shopify-sync";

export const maxDuration = 120;

/** Diário 6h05 — confere se algum webhook se perdeu (regra do desenho, seção 3). Silencioso se não achar divergência. */
export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!shopifyConfigured()) return NextResponse.json({ ok: false, skipped: "Shopify não configurada" });

  const products = await fetchAllShopifyProducts();
  for (const p of products) await upsertShopifyMirror(p, "SHOPIFY");
  return NextResponse.json({ ok: true, reconciled: products.length });
}
