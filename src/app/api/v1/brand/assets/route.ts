import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { getBrand } from "@/lib/compliance";
import { prisma } from "@/lib/prisma";

/**
 * Porta de identidade visual — tudo que um gerador de peça (Sidney, 007) precisa pra que a
 * imagem saia com a cara da Élyx, e SÓ com o que está carregado aqui:
 *   - cores e fontes (nome) do Guia da marca
 *   - logo (arquivo renderizável: png/svg/jpg/webp — PDF é listado mas marcado como não renderizável)
 *   - arquivos de fonte (.ttf/.otf/.woff) pra renderizar as lâminas com a tipografia oficial
 *   - prints de posts/anúncios "que gostei" (referência de estilo pra IA)
 *   - fotos de referência da marca (pessoa, ambiente)
 *   - links de posts que gostei (Evidence sem produto, com URL do Instagram)
 * Auth por chave de consumidor, igual às outras portas.
 */
const RENDERABLE = /\.(png|svg|jpe?g|webp)(\?|$)/i;
const FONT_FILE = /\.(ttf|otf|woff)(\?|$)/i;

export async function GET(req: NextRequest) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [brand, assets, evidences] = await Promise.all([
    getBrand(),
    prisma.asset.findMany({ where: { productId: null }, orderBy: { createdAt: "asc" } }),
    prisma.evidence.findMany({ where: { productId: null }, orderBy: { createdAt: "asc" } }),
  ]);

  const byType = (t: string) => assets.filter((a) => a.type === t);
  const logos = byType("logo");
  const logo = logos.find((a) => RENDERABLE.test(a.blobUrl)) ?? null;
  const fontFiles = assets.filter((a) => FONT_FILE.test(a.blobUrl));
  const posts = evidences.filter((e) => e.url && /instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(e.url));

  return NextResponse.json({
    identidade: {
      cores: {
        primaria: brand.colorPrimary,
        secundaria: brand.colorSecondary,
        fundo: brand.colorBackground,
        destaque: brand.colorAccent,
        texto: brand.colorText,
      },
      fontes: { titulo: brand.fontDisplay, texto: brand.fontBody },
      regrasImagem: brand.imageRules,
      completa: Boolean(brand.colorPrimary && brand.colorBackground && brand.colorAccent && brand.fontDisplay && brand.fontBody && brand.imageRules),
    },
    logo: logo ? { url: logo.blobUrl, label: logo.label } : null,
    logosNaoRenderizaveis: logos.filter((a) => !RENDERABLE.test(a.blobUrl)).map((a) => ({ url: a.blobUrl, label: a.label })),
    fontes: fontFiles.map((a) => ({ url: a.blobUrl, label: a.label, arquivo: decodeURIComponent(a.blobUrl.split("/").pop() ?? "") })),
    referencias: byType("reference").filter((a) => RENDERABLE.test(a.blobUrl)).map((a) => ({ url: a.blobUrl, label: a.label })),
    fotos: byType("photo").filter((a) => RENDERABLE.test(a.blobUrl)).map((a) => ({ url: a.blobUrl, label: a.label })),
    manuais: [...byType("guideline"), ...byType("font").filter((a) => !FONT_FILE.test(a.blobUrl))].map((a) => ({ url: a.blobUrl, label: a.label })),
    postsQueGostei: posts.map((e) => ({ titulo: e.title, url: e.url, nota: e.note })),
    atualizadoEm: brand.updatedAt,
  });
}
