import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Decisão do Marcio (07/09/2026): Montserrat vira a fonte de texto OFICIAL definitiva da Élyx,
 * ao lado da TAN Aegean (título) — resolve a pendência da Agrandir, cuja licença comercial real
 * (Pangram Pangram) começa em US$ 1.780 por tipo de uso, não os ~US$ 40 que se imaginava.
 * Montserrat é gratuita (OFL); o Sidney já tem os arquivos embutidos, não precisa subir aqui.
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const old = b.fontBody;
  if (old === "Montserrat") { console.log("já é Montserrat — nada alterado."); return; }
  await prisma.brand.update({ where: { id: "default" }, data: { fontBody: "Montserrat", updatedBy: "set-fontbody-montserrat (07/09/2026)" } });
  await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "fontBody", oldValue: old, newValue: "Montserrat", origin: "MANUAL", changedBy: "set-fontbody-montserrat" } });
  console.log(`fontBody: "${old}" → "Montserrat"`);
}
main().finally(() => prisma.$disconnect());
