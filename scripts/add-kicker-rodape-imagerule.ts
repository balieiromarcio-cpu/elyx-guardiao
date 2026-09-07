import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Decisões do Marcio (07/09/2026), gravadas no imageRules do Guia da marca (fonte única da identidade):
 *  - KICKER liberado (a memória do Sidney dizia "sem kicker" a partir dos prints; Marcio decidiu manter).
 *  - RODAPÉ: fonte/referência sempre no rodapé da lâmina — o Marcio já tinha escrito isso em texto livre;
 *    aqui entra a versão estruturada, sem apagar o parágrafo dele. Aditivo e idempotente.
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const LINES = [
  "KICKER (decisão do Marcio 07/09/2026): PERMITIDO — linha curta em caixa alta, letras espaçadas, acima do título (ex.: 'EM 1 FRASE', 'O QUE A CIÊNCIA MOSTRA'), até 4 palavras, no máximo uma por lâmina.",
  "RODAPÉ DA LÂMINA (regra fixa): toda fonte/referência — PMID, revista e ano, ANVISA, nome de estudo — fica no RODAPÉ da lâmina, em letra pequena e cor mais clara/apagada que o resto; nunca no corpo do texto, nunca no título. A lâmina PODE ter rodapé de fonte; o que não pode é rodapé com nome de marca, contador de lâminas ou faixa decorativa.",
];

async function main() {
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const current = b.imageRules ?? "";
  if (current.includes("KICKER (decisão do Marcio")) { console.log("já existe — nada alterado."); return; }
  const next = `${current.trimEnd()}\n${LINES.join("\n")}`;
  await prisma.brand.update({ where: { id: "default" }, data: { imageRules: next, updatedBy: "add-kicker-rodape-imagerule (07/09/2026)" } });
  await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "imageRules", oldValue: current.slice(0, 500), newValue: next.slice(0, 500), origin: "MANUAL", changedBy: "add-kicker-rodape-imagerule" } });
  console.log("Regras de kicker e rodapé adicionadas ao imageRules.");
}
main().finally(() => prisma.$disconnect());
