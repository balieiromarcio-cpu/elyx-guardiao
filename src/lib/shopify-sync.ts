import { prisma } from "@/lib/prisma";
import type { ShopifyProduct } from "@/lib/shopify";
import { logChange, openReviewTask } from "@/lib/versioning";
import { notifyTeam } from "@/lib/email";

function primaryPrice(p: ShopifyProduct): { price: string | null; compareAt: string | null } {
  const v = p.variants[0];
  return { price: v?.price ?? null, compareAt: v?.compare_at_price ?? null };
}

/**
 * Grava/atualiza o espelho comercial de um produto vindo da Shopify (webhook ou
 * reconciliação). Casa por handle com Product.shopHandle; se não achar produto,
 * cria um em RASCUNHO e avisa a equipe (regra: "ficha nova precisa de rótulo").
 */
export async function upsertShopifyMirror(sp: ShopifyProduct, origin: "SHOPIFY" | "IMPORT" = "SHOPIFY") {
  let product = await prisma.product.findFirst({ where: { OR: [{ shopHandle: sp.handle }, { shopifyMirror: { shopifyProductId: String(sp.id) } }] } });

  let isNew = false;
  if (!product) {
    isNew = true;
    product = await prisma.product.create({ data: { slug: sp.handle, name: sp.title, shopHandle: sp.handle, status: "RASCUNHO" } });
    await logChange({ entity: "Product", entityId: product.id, field: "criado", oldValue: null, newValue: sp.title, origin });
  }

  const { price, compareAt } = primaryPrice(sp);
  const existing = await prisma.shopifyMirror.findUnique({ where: { productId: product.id } });

  const priceChanged = existing && String(existing.price ?? "") !== (price ?? "");
  const statusChanged = existing && existing.status !== sp.status;

  await prisma.shopifyMirror.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      shopifyProductId: String(sp.id),
      handle: sp.handle,
      status: sp.status,
      price: price ? Number(price) : null,
      compareAtPrice: compareAt ? Number(compareAt) : null,
      variants: sp.variants as unknown as object,
      images: sp.images as unknown as object,
    },
    update: {
      handle: sp.handle,
      status: sp.status,
      price: price ? Number(price) : null,
      compareAtPrice: compareAt ? Number(compareAt) : null,
      variants: sp.variants as unknown as object,
      images: sp.images as unknown as object,
      syncedAt: new Date(),
    },
  });

  if (priceChanged) {
    await logChange({ entity: "ShopifyMirror", entityId: product.id, field: "preço", oldValue: existing?.price?.toString() ?? null, newValue: price, origin });
  }
  if (statusChanged) {
    await logChange({ entity: "ShopifyMirror", entityId: product.id, field: "status", oldValue: existing?.status ?? null, newValue: sp.status, origin });
    if (sp.status === "archived" && product.status === "ATIVO") {
      await prisma.product.update({ where: { id: product.id }, data: { status: "DESCONTINUADO" } });
    }
  }

  if (isNew) {
    await openReviewTask({ description: `Produto novo importado da Shopify: "${sp.title}" — precisa de foto do rótulo pra ganhar ficha.`, productId: product.id, systems: ["equipe Élyx"] });
    await notifyTeam(`Produto novo na Shopify: ${sp.title}`, `A Shopify criou/expôs o produto "${sp.title}" (handle ${sp.handle}). Ele entrou no Guardião em rascunho, sem ficha. Fotografe o rótulo e cadastre a versão em /dashboard/produtos/${product.slug}.`);
  }

  return product;
}
