import { prisma } from "@/lib/prisma";
import type { ChangeOrigin } from "@/generated/prisma/client";
import { dispatchEvent } from "@/lib/webhooks";
import { notifyTeam } from "@/lib/email";

/** Versão vigente de um produto — a única que a API de leitura serve. */
export async function getActiveVersion(productId: string) {
  return prisma.productVersion.findFirst({
    where: { productId, status: "VIGENTE" },
    include: { ingredients: { orderBy: { order: "asc" } } },
    orderBy: { versionNumber: "desc" },
  });
}

/** Registra uma mudança de fato — nunca sobrescreve, sempre acrescenta uma linha. */
export async function logChange(input: {
  entity: string;
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  origin: ChangeOrigin;
  changedBy?: string | null;
  approvedBy?: string | null;
}) {
  return prisma.changeLog.create({ data: input });
}

/**
 * Quando um fato citado muda (versão nova vira vigente, claim muda), abre tarefas de
 * revisão listando os sistemas que citam esse fato. Fase 1: lista fixa de consumidores
 * conhecidos (007, Sidney, portal) — fase 3 pode restringir por quem realmente leu o fato
 * (via lastUsedAt do ApiKey) quando isso existir.
 */
const KNOWN_CONTENT_SYSTEMS = ["elyx-007 (roteiros e kits)", "elyx-sidney (artigos e e-mails)", "portal das associadas"];

export async function openReviewTask(input: { description: string; productId?: string | null; systems?: string[] }) {
  return prisma.reviewTask.create({
    data: {
      description: input.description,
      productId: input.productId ?? null,
      systemsAffected: input.systems ?? KNOWN_CONTENT_SYSTEMS,
    },
  });
}

const FIELDS_TO_DIFF = ["dosage", "packaging", "warnings", "anvisaRegistry", "facts"] as const;

/**
 * Torna uma versão aprovada VIGENTE: encerra a versão vigente atual (se houver),
 * registra no changelog cada campo que mudou, abre tarefa de revisão pro conteúdo
 * afetado e avisa a equipe + sistemas assinantes (regra do desenho, seção 3).
 * Só roda pra versão já aprovada (approvedAt setado) cuja vigência já chegou.
 */
export async function activateVersion(versionId: string) {
  const version = await prisma.productVersion.findUnique({ where: { id: versionId }, include: { ingredients: true, product: true } });
  if (!version || version.status !== "PROPOSTA" || !version.approvedAt) return null;
  if (version.effectiveFrom.getTime() > Date.now()) return null;

  const previous = await prisma.productVersion.findFirst({ where: { productId: version.productId, status: "VIGENTE" }, include: { ingredients: true } });

  await prisma.$transaction([
    ...(previous
      ? [prisma.productVersion.update({ where: { id: previous.id }, data: { status: "ENCERRADA", effectiveTo: version.effectiveFrom } })]
      : []),
    prisma.productVersion.update({ where: { id: version.id }, data: { status: "VIGENTE" } }),
    prisma.product.update({ where: { id: version.productId }, data: { status: "ATIVO" } }),
  ]);

  const changedFields: string[] = [];
  for (const f of FIELDS_TO_DIFF) {
    const oldV = previous ? (previous[f] as string | null) : null;
    const newV = version[f] as string | null;
    if (oldV !== newV) {
      changedFields.push(f);
      await logChange({ entity: "ProductVersion", entityId: version.productId, field: f, oldValue: oldV, newValue: newV, origin: "MANUAL", changedBy: version.proposedBy, approvedBy: version.approvedBy });
    }
  }
  const oldIng = previous ? previous.ingredients.map((i) => `${i.name} ${i.quantity ?? ""}${i.unit ?? ""}`).join(", ") : null;
  const newIng = version.ingredients.map((i) => `${i.name} ${i.quantity ?? ""}${i.unit ?? ""}`).join(", ");
  if (oldIng !== newIng) {
    changedFields.push("ingredientes");
    await logChange({ entity: "ProductVersion", entityId: version.productId, field: "ingredientes", oldValue: oldIng, newValue: newIng, origin: "MANUAL", changedBy: version.proposedBy, approvedBy: version.approvedBy });
  }

  if (changedFields.length) {
    await openReviewTask({
      description: `${version.product.name}: versão ${version.versionNumber} entrou em vigor (${changedFields.join(", ")}). Revise todo conteúdo que citava a versão anterior.`,
      productId: version.productId,
    });
    await notifyTeam(
      `Ficha do ${version.product.name} mudou (versão ${version.versionNumber} vigente)`,
      `Campos alterados: ${changedFields.join(", ")}.\nAprovado por: ${version.approvedBy}.\nUma tarefa de revisão foi aberta listando o conteúdo afetado em cada sistema.`
    );
  }
  await dispatchEvent("product.updated", { slug: version.product.slug, versionId: version.id, changedFields });

  return version;
}

/** Aprova uma versão proposta. Se a vigência já chegou, ativa na hora; senão fica "aprovada, aguardando data". */
export async function approveVersion(versionId: string, approvedBy: string) {
  const version = await prisma.productVersion.update({ where: { id: versionId }, data: { approvedBy, approvedAt: new Date() } });
  if (version.effectiveFrom.getTime() <= Date.now()) return activateVersion(versionId);
  return version;
}

/** Roda pelo cron diário: ativa toda versão já aprovada cuja data de vigência chegou. */
export async function activateDueVersions() {
  const due = await prisma.productVersion.findMany({
    where: { status: "PROPOSTA", approvedAt: { not: null }, effectiveFrom: { lte: new Date() } },
  });
  const activated: string[] = [];
  for (const v of due) {
    const r = await activateVersion(v.id);
    if (r) activated.push(v.id);
  }
  return activated;
}
