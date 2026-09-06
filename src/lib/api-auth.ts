import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Auth do cron (Vercel Cron manda "Authorization: Bearer <CRON_SECRET>").
 * Fail-closed: sem CRON_SECRET no ambiente, ninguém entra. Comparação em
 * tempo constante contra timing attack. Mesmo padrão do 007/associadas.
 */
export function isValidCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(authHeader ?? "");
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(got, expected);
}

function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/** Gera uma chave nova pro consumidor: "gdn_<32 hex>". Só é mostrada uma vez, na criação. */
export function generateApiKey(): { raw: string; hash: string; preview: string } {
  const raw = `gdn_${crypto.randomBytes(24).toString("hex")}`;
  return { raw, hash: hashKey(raw), preview: raw.slice(-4) };
}

/**
 * Auth das portas /v1/* — cada sistema consumidor (007, Sidney, portal, agentes futuros)
 * manda "Authorization: Bearer <chave>". Compara pelo hash, nunca guarda a chave em texto
 * puro. Atualiza lastUsedAt (best-effort, não bloqueia a resposta).
 */
export async function authenticateConsumer(authHeader: string | null): Promise<{ consumer: string } | null> {
  const raw = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!raw) return null;
  const hash = hashKey(raw);
  const key = await prisma.apiKey.findFirst({ where: { keyHash: hash, revokedAt: null } });
  if (!key) return null;
  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => null);
  return { consumer: key.consumer };
}
