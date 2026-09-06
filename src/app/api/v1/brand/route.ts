import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { getBrand } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const brand = await getBrand();
  const globalClaims = await prisma.claim.findMany({ where: { scope: "GLOBAL" } });
  return NextResponse.json({
    proposito: brand.purpose,
    persona: brand.persona,
    tomDeVoz: brand.voiceRules,
    regrasMonica: brand.monicaRules,
    regrasCta: brand.ctaRules,
    vocabularioPermitido: brand.allowedVocab,
    termosProibidos: brand.bannedTerms,
    claimsGlobais: globalClaims.map((c) => ({ tipo: c.type, texto: c.text })),
    disclaimers: brand.disclaimers,
    atualizadoEm: brand.updatedAt,
  });
}
