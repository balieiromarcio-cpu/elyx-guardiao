import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, type ShopifyProduct } from "@/lib/shopify";
import { upsertShopifyMirror } from "@/lib/shopify-sync";
import { prisma } from "@/lib/prisma";
import { logChange } from "@/lib/versioning";

/**
 * Recebe products/create, products/update e products/delete da Shopify. Verifica o HMAC
 * (fail-closed) antes de tocar no corpo — regra do desenho: preço/estoque/variantes entram
 * em minutos, sem aprovação, porque quem manda no comercial é a Shopify.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  if (!verifyShopifyWebhook(rawBody, hmac)) return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const payload = JSON.parse(rawBody) as ShopifyProduct & { id: number };

  if (topic === "products/delete") {
    const mirror = await prisma.shopifyMirror.findUnique({ where: { shopifyProductId: String(payload.id) } });
    if (mirror) {
      await prisma.product.update({ where: { id: mirror.productId }, data: { status: "DESCONTINUADO" } });
      await logChange({ entity: "Product", entityId: mirror.productId, field: "status", oldValue: "ATIVO", newValue: "DESCONTINUADO (apagado na Shopify)", origin: "SHOPIFY" });
    }
    return NextResponse.json({ ok: true });
  }

  await upsertShopifyMirror(payload, "SHOPIFY");
  return NextResponse.json({ ok: true });
}
