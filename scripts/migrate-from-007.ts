import "dotenv/config";
import { PrismaClient as Prisma007 } from "../../elyx-007/src/generated/prisma/client";
import { PrismaNeon as PrismaNeon007 } from "@prisma/adapter-neon";
import { PrismaClient as PrismaGuardiao } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Fase 1b — traz Product e BrandGuide do banco do elyx-007 pra dentro do Guardião como
 * versão VIGENTE (aprovada por quem rodou, hoje, sem documento — é migração de dado já
 * existente, não fato novo; a próxima alteração real exige rótulo como qualquer outra).
 *
 * Requer DOIS bancos configurados no ambiente:
 *   DATABASE_URL        -> banco do Guardião (destino)
 *   DATABASE_URL_007     -> banco do elyx-007 (origem, só leitura)
 *
 * Rodar uma vez, manualmente: npx tsx scripts/migrate-from-007.ts
 */
async function main() {
  const url007 = process.env.DATABASE_URL_007;
  if (!url007) throw new Error("DATABASE_URL_007 não definido — copie o valor de DATABASE_URL do elyx-007 (.env) pra rodar a migração uma vez.");

  const db007 = new Prisma007({ adapter: new PrismaNeon007({ connectionString: url007 }) });
  const guardiao = new PrismaGuardiao({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

  const [oldProducts, oldGuide] = await Promise.all([db007.product.findMany(), db007.brandGuide.findUnique({ where: { id: "default" } })]);

  if (oldGuide) {
    await guardiao.brand.update({
      where: { id: "default" },
      data: {
        bannedTerms: { push: oldGuide.bannedTerms.filter(Boolean) },
        allowedVocab: { push: oldGuide.allowedVocab.filter(Boolean) },
        voiceRules: oldGuide.rules ?? undefined,
        updatedBy: "migração 007",
      },
    });
    console.log("BrandGuide do 007 mesclado no Brand do Guardião (bannedTerms/allowedVocab/rules).");
  }

  let migrated = 0;
  for (const p of oldProducts) {
    const product = await guardiao.product.upsert({
      where: { slug: p.slug },
      update: { name: p.name, shopHandle: p.shopHandle ?? undefined },
      create: { slug: p.slug, name: p.name, shopHandle: p.shopHandle, status: "RASCUNHO" },
    });

    const alreadyHasVersion = await guardiao.productVersion.findFirst({ where: { productId: product.id } });
    if (alreadyHasVersion) {
      console.log(`${p.slug}: já tem versão no Guardião — pulado (rode a UI pra propor atualização).`);
      continue;
    }
    if (!p.ingredients.length && !p.dosage && !p.packaging && !p.facts) {
      console.log(`${p.slug}: 007 não tinha ficha preenchida — nada a migrar, aguarda foto do rótulo.`);
      continue;
    }

    await guardiao.productVersion.create({
      data: {
        productId: product.id,
        versionNumber: 1,
        status: "VIGENTE",
        effectiveFrom: new Date(),
        dosage: p.dosage,
        packaging: p.packaging,
        facts: p.facts ? `${p.facts}\n\n[migrado do 007 em ${new Date().toISOString().slice(0, 10)} — SEM foto de rótulo anexada, confirme com o rótulo real na próxima revisão]` : null,
        proposedBy: "migração 007",
        approvedBy: "migração 007",
        approvedAt: new Date(),
        ingredients: { create: p.ingredients.map((name, idx) => ({ name, order: idx })) },
      },
    });

    for (const [type, list] of [["ALLOWED", p.allowedClaims] as const, ["FORBIDDEN", p.forbiddenTerms] as const]) {
      for (const text of list) {
        if (!text.trim()) continue;
        const exists = await guardiao.claim.findFirst({ where: { productId: product.id, text, type } });
        if (!exists) await guardiao.claim.create({ data: { scope: "PRODUCT", productId: product.id, type, text, createdBy: "migração 007" } });
      }
    }

    migrated++;
    console.log(`${p.slug}: migrado como versão 1 vigente (SEM documento — sinalizar pra fotografar o rótulo real).`);
  }

  console.log(`\nMigração concluída: ${migrated} produto(s) com ficha trazida do 007.`);
  console.log("IMPORTANTE: nenhuma dessas versões tem foto de rótulo anexada (o 007 nunca teve isso). Trate como");
  console.log("provisório — a próxima confirmação com o rótulo real, ainda que sem mudar nada, deve entrar como nova");
  console.log("versão com documento, pra ficha vigente parar de depender de fato sem prova anexada.");

  await db007.$disconnect();
  await guardiao.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
