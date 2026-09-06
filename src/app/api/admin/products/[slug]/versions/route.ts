import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type IngredientInput = { name: string; quantity?: string; unit?: string; dailyValuePercent?: string };

/**
 * Propõe uma nova versão da ficha (rótulo). Qualquer usuário logado pode propor
 * (a nutricionista propõe, não publica) — a aprovação é uma ação separada
 * (PATCH .../versions/[versionId]), reservada por convenção a quem for ADMIN.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) return NextResponse.json({ error: "produto não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : new Date();
  if (Number.isNaN(effectiveFrom.getTime())) return NextResponse.json({ error: "data de vigência inválida" }, { status: 400 });
  if (!body.documentUrl) return NextResponse.json({ error: "anexe a foto do rótulo ou o laudo antes de propor a versão" }, { status: 400 });

  const ingredients: IngredientInput[] = Array.isArray(body.ingredients) ? body.ingredients : [];
  const last = await prisma.productVersion.findFirst({ where: { productId: product.id }, orderBy: { versionNumber: "desc" } });

  const version = await prisma.productVersion.create({
    data: {
      productId: product.id,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      status: "PROPOSTA",
      effectiveFrom,
      dosage: body.dosage || null,
      packaging: body.packaging || null,
      warnings: body.warnings || null,
      anvisaRegistry: body.anvisaRegistry || null,
      facts: body.facts || null,
      documentUrl: body.documentUrl || null,
      proposedBy: session.user.name ?? session.user.email ?? "equipe",
      ingredients: {
        create: ingredients
          .filter((i) => i.name?.trim())
          .map((i, idx) => ({ name: i.name.trim(), quantity: i.quantity || null, unit: i.unit || null, dailyValuePercent: i.dailyValuePercent || null, order: idx })),
      },
    },
    include: { ingredients: true },
  });

  return NextResponse.json({ ok: true, version });
}
