import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { generateApiKey } from "../src/lib/api-auth";

/**
 * Cria (ou renova) uma chave de leitura pra um consumidor — uso: `npx tsx scripts/create-dev-key.ts elyx-sidney-dev`.
 * A chave em texto puro é impressa UMA vez; só o hash fica no banco (igual à tela Chaves e assinantes).
 * Serve pra ambiente local de desenvolvimento de um consumidor (a chave de produção dele fica no Vercel).
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const consumer = process.argv[2];
  if (!consumer) throw new Error("informe o nome do consumidor");
  const { raw, hash, preview } = generateApiKey();
  await prisma.apiKey.upsert({ where: { consumer }, update: { keyHash: hash, keyPreview: preview, revokedAt: null }, create: { consumer, keyHash: hash, keyPreview: preview } });
  console.log(`KEY ${consumer}: ${raw}`);
}
main().finally(() => prisma.$disconnect());
