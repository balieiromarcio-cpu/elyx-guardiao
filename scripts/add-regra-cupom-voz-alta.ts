import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Persiste no Guardião a regra "nunca falar o código do cupom em voz alta" — decisão já em vigor
 * (usada no manual de marca gerado pelo Sidney em 07/09/2026), mas que só existia relatada entre
 * sessões, não gravada no ctaRules. Aditivo (não sobrescreve): só adiciona se ainda não existir.
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const LINE = "Nunca falar o código do cupom em voz alta (roteiro, reel, live) — o link já aplica o desconto sozinho. CTA sempre natural, nunca \"corre que está acabando\" ou urgência fabricada.";

async function main() {
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const current = b.ctaRules ?? "";
  if (current.includes("Nunca falar o código do cupom em voz alta")) { console.log("já existe — nada alterado."); return; }
  const next = current.trim() ? `${current.trimEnd()}\n${LINE}` : LINE;
  await prisma.brand.update({ where: { id: "default" }, data: { ctaRules: next, updatedBy: "add-regra-cupom-voz-alta (07/09/2026)" } });
  await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "ctaRules", oldValue: current.slice(0, 500), newValue: next.slice(0, 500), origin: "MANUAL", changedBy: "add-regra-cupom-voz-alta" } });
  console.log("Regra do cupom em voz alta adicionada ao ctaRules.");
}
main().finally(() => prisma.$disconnect());
