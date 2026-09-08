import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateConsumer } from "@/lib/api-auth";
import { getActiveVersion } from "@/lib/versioning";

/**
 * Porta 1 — dado estruturado da ficha vigente + espelho comercial (nunca preço fixo em
 * conteúdo: quem lê pega o valor daqui, na hora). Auth por chave de consumidor.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      shopifyMirror: true,
      claims: { where: { approved: true } },
      faqs: { where: { approved: true } },
      assets: { where: { type: "photo" }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!product) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  const version = await getActiveVersion(product.id);

  return NextResponse.json({
    slug: product.slug,
    name: product.name,
    status: product.status,
    shopHandle: product.shopHandle,
    fotos: {
      principal: product.assets.find((a) => a.isPrimary)?.blobUrl ?? product.assets[0]?.blobUrl ?? null,
      todas: product.assets.map((a) => ({ url: a.blobUrl, label: a.label, principal: a.isPrimary })),
    },
    comercial: product.shopifyMirror
      ? {
          preco: product.shopifyMirror.price,
          precoComparacao: product.shopifyMirror.compareAtPrice,
          statusLoja: product.shopifyMirror.status,
          sincronizadoEm: product.shopifyMirror.syncedAt,
        }
      : null,
    ficha: version
      ? {
          versao: version.versionNumber,
          vigenteDesde: version.effectiveFrom,
          ingredientes: version.ingredients.map((i) => ({ nome: i.name, quantidade: i.quantity, unidade: i.unit, percentualVD: i.dailyValuePercent })),
          posologia: version.dosage,
          embalagem: version.packaging,
          avisos: version.warnings,
          registroAnvisa: version.anvisaRegistry,
          fatos: version.facts,
        }
      : null,
    podeDizer: product.claims.filter((c) => c.type === "ALLOWED").map((c) => c.text),
    naoDizer: product.claims.filter((c) => c.type === "FORBIDDEN").map((c) => c.text),
    faq: product.faqs.map((f) => ({ pergunta: f.question, resposta: f.answer })),
  });
}
