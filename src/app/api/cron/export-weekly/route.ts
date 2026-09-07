import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isValidCronAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { notifyTeam } from "@/lib/email";

export const maxDuration = 60;

/**
 * Semanal (domingo 7h) — exporta tudo em JSON pro Blob. Regra do desenho: "o Guardião
 * precisa sobreviver a mim" — qualquer desenvolvedor assume a partir deste dump + do
 * schema.prisma no repositório, mesmo sem acesso ao banco de produção.
 */
export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const [brand, products, versions, ingredients, claims, faqs, evidences, assets, shopifyMirrors, programs, changeLog, reviewTasks] = await Promise.all([
      prisma.brand.findMany(),
      prisma.product.findMany(),
      prisma.productVersion.findMany(),
      prisma.ingredient.findMany(),
      prisma.claim.findMany(),
      prisma.faq.findMany(),
      prisma.evidence.findMany(),
      prisma.asset.findMany(),
      prisma.shopifyMirror.findMany(),
      prisma.program.findMany(),
      prisma.changeLog.findMany(),
      prisma.reviewTask.findMany(),
    ]);

    const dump = { exportedAt: new Date().toISOString(), brand, products, versions, ingredients, claims, faqs, evidences, assets, shopifyMirrors, programs, changeLog, reviewTasks };
    const filename = `guardiao-export-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = await put(`exports/${filename}`, JSON.stringify(dump, null, 2), { access: "public", addRandomSuffix: false, contentType: "application/json" });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await notifyTeam("Backup semanal do Guardião falhou", `A exportação semanal do banco inteiro (export-weekly) falhou hoje:\n\n${msg}\n\nSem esse dump, o único backup é o do próprio Neon — confira se ele está ativo no console.`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
