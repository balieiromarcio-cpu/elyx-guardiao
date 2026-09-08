"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logChange } from "@/lib/versioning";

/**
 * Ativos de identidade visual e material de referência da marca (productId nulo = marca,
 * não um produto específico). Upload do arquivo já aconteceu no Blob (client upload); aqui
 * só gravamos o registro. Chamado direto do client component depois do upload — sem rota de
 * API própria, Server Action mesmo.
 */
export async function addBrandAsset(input: { type: string; blobUrl: string; label: string | null }) {
  const s = await auth();
  if (!s) throw new Error("unauthorized");
  const asset = await prisma.asset.create({ data: { productId: null, type: input.type, blobUrl: input.blobUrl, label: input.label } });
  await logChange({ entity: "Asset", entityId: asset.id, field: "criado", oldValue: null, newValue: input.label ?? input.type, origin: "MANUAL", changedBy: s.user.name ?? s.user.email });
  return asset;
}

/** Imagem de referência (estilo/prints "post que gostei") só some com um admin — é a base do que a IA usa como referência visual. Os demais materiais (logo, guideline, fonte, foto, vídeo) qualquer um da equipe pode excluir. */
export async function deleteBrandAsset(id: string) {
  const s = await auth();
  if (!s) throw new Error("unauthorized");
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (asset?.type === "reference" && s.user.role !== "ADMIN") throw new Error("apenas administradores podem excluir imagem de referência");
  await prisma.asset.delete({ where: { id } }).catch(() => null);
}
