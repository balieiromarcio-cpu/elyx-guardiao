import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Acrescenta a restrição de refinamento/contenção ao imageRules do Guia da marca — pedido do Marcio
 * (07/09/2026): "como treinamos nossa equipe toda para fazer com mais refino, mais delicadeza".
 * Aditivo (não sobrescreve): só adiciona se a linha ainda não existir.
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const LINE = "REFINAMENTO: a marca nunca grita — gesto contido, cenário com poucos objetos bem escolhidos, luz que sugere em vez de exibir. Evitar pose de catálogo/propaganda, expressão exagerada, cena cheia de elementos competindo por atenção. Densidade e contraste ricos SIM; drama e exagero NÃO.";

async function main() {
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const current = b.imageRules ?? "";
  if (current.includes("REFINAMENTO:")) { console.log("já existe — nada alterado."); return; }
  const next = `${current.trimEnd()}\n${LINE}`;
  await prisma.brand.update({ where: { id: "default" }, data: { imageRules: next, updatedBy: "add-refinamento-imagerule (07/09/2026)" } });
  await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "imageRules", oldValue: current.slice(0, 500), newValue: next.slice(0, 500), origin: "MANUAL", changedBy: "add-refinamento-imagerule" } });
  console.log("Regra de refinamento adicionada ao imageRules.");
}
main().finally(() => prisma.$disconnect());
