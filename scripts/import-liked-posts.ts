import "dotenv/config";
import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Importa os "posts que gostei" (links do Instagram cadastrados em Referências) como IMAGEM de referência
 * (Asset type "reference"), pra que o diretor de arte e o gerador consigam vê-los. O link em si nunca
 * vira imagem sozinho: o Instagram bloqueia robôs; a imagem foi extraída pelo navegador e a lista
 * (code → URL assinada do CDN, expira em dias) vem num JSON. Idempotente: pula post já importado.
 * Uso: npx tsx scripts/import-liked-posts.ts <arquivo.json>
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("informe o JSON [{code,url}]");
  const posts = JSON.parse(readFileSync(file, "utf8")) as { code: string; url: string }[];
  const existing = await prisma.asset.findMany({ where: { productId: null, type: "reference", label: { contains: "instagram.com/p/" } }, select: { label: true } });
  const done = new Set(existing.map((e) => e.label ?? ""));
  let n = 0;
  for (const p of posts) {
    const label = `Post @elyx.oficial que gostei — https://www.instagram.com/p/${p.code}/ (imagem importada do link)`;
    if (done.has(label)) { console.log("já existe", p.code); continue; }
    const res = await fetch(p.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) { console.log("FALHOU", p.code, res.status); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const blob = await put(`brand/liked-posts/${p.code}.jpg`, buf, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
    const asset = await prisma.asset.create({ data: { productId: null, type: "reference", blobUrl: blob.url, label } });
    await prisma.changeLog.create({ data: { entity: "Asset", entityId: asset.id, field: "criado", oldValue: null, newValue: label, origin: "MANUAL", changedBy: "import-liked-posts" } });
    console.log("ok", p.code, `${Math.round(buf.length / 1024)} KB`);
    n++;
  }
  console.log(`importados: ${n}`);
}
main().finally(() => prisma.$disconnect());
