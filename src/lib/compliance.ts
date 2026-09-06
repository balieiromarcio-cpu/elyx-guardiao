import { prisma } from "@/lib/prisma";
import { findComplianceFlags } from "@/lib/classify";
import { getActiveVersion } from "@/lib/versioning";

const DEFAULT_BRAND = {
  bannedTerms: ["milagre", "sem efeitos colaterais", "comprovado cientificamente", "compra de olhos fechados", "subindo pelas paredes"],
  allowedVocab: ["auxilia", "contribui", "apoia", "ajuda na manutenção", "faz parte de uma rotina", "fórmula com ativos reconhecidos", "bem-estar", "vitalidade"],
  voiceRules:
    "Só cite ativo, forma, dosagem, embalagem ou tecnologia que esteja na ficha vigente do Guardião. Se a ficha não diz, o conteúdo não diz. Nunca cite marca de matéria-prima que não esteja na ficha. Nunca prometa resultado em prazo. Nunca fale código de cupom (o link já carrega o desconto).",
};

export async function getBrand() {
  const b = await prisma.brand.findUnique({ where: { id: "default" } });
  if (b) return b;
  return prisma.brand.create({ data: { id: "default", ...DEFAULT_BRAND } });
}

function termRegex(term: string): RegExp {
  const esc = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // \b não funciona bem com acento em JS — usa fronteira "não-letra" manual.
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}])`, "iu");
}

/**
 * Flags de compliance = lista fixa (ANVISA/CONAR) + termos globais do Guardião (Brand)
 * + claims proibidos (globais e do produto). Porta pública: POST /v1/compliance/check.
 */
export async function checkCompliance(text: string | null | undefined, productSlug?: string | null): Promise<string[]> {
  if (!text) return [];
  const flags = new Set<string>(findComplianceFlags(text));
  const brand = await getBrand();
  for (const t of brand.bannedTerms) if (t.trim() && termRegex(t).test(text)) flags.add(`termo proibido: ${t.trim()}`);

  const product = productSlug ? await prisma.product.findUnique({ where: { slug: productSlug } }) : null;
  const claims = await prisma.claim.findMany({
    where: { type: "FORBIDDEN", OR: [{ scope: "GLOBAL" }, ...(product ? [{ scope: "PRODUCT" as const, productId: product.id }] : [])] },
  });
  for (const c of claims) if (c.text.trim() && termRegex(c.text).test(text)) flags.add(`${product ? `não existe no ${product.name}` : "não permitido"}: ${c.text.trim()}`);

  return [...flags];
}

/** Bloco de texto pronto pra prompt de qualquer agente — GET /v1/products/:slug/context. */
export async function productContextBlock(slug: string): Promise<string | null> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { shopifyMirror: true, claims: true, faqs: { where: { approved: true } } },
  });
  if (!product) return null;
  const version = await getActiveVersion(product.id);

  const lines: string[] = [`# ${product.name}`];
  if (product.shopHandle) lines.push(`Loja: elyxnutrition.com.br/products/${product.shopHandle}`);
  lines.push(`Preço: NUNCA cite um valor fixo — use "preço atual" ou consulte GET /v1/products/${slug} na hora.`);

  if (version) {
    const ing = version.ingredients.map((i) => `${i.name}${i.quantity ? ` ${i.quantity}${i.unit ?? ""}` : ""}${i.dailyValuePercent ? ` (%VD ${i.dailyValuePercent})` : ""}`);
    lines.push(`Ingredientes (ÚNICOS que podem ser citados, versão ${version.versionNumber} vigente desde ${version.effectiveFrom.toISOString().slice(0, 10)}): ${ing.join(", ") || "—"}.`);
    if (version.dosage) lines.push(`Posologia oficial: ${version.dosage}.`);
    if (version.packaging) lines.push(`Embalagem: ${version.packaging}.`);
    if (version.warnings) lines.push(`Avisos obrigatórios: ${version.warnings}.`);
    if (version.facts) lines.push(`Fatos confirmados: ${version.facts}`);
  } else {
    lines.push("SEM FICHA VIGENTE AINDA — não afirme ingrediente, dose ou embalagem deste produto. Pergunte ao Guardião antes de escrever.");
  }

  const allowed = product.claims.filter((c) => c.type === "ALLOWED").map((c) => c.text);
  const forbidden = product.claims.filter((c) => c.type === "FORBIDDEN").map((c) => c.text);
  if (allowed.length) lines.push(`PODE dizer: ${allowed.map((c) => `"${c}"`).join("; ")}.`);
  if (forbidden.length) lines.push(`NUNCA citar (não existe neste produto / proibido): ${forbidden.join(", ")}.`);
  if (product.faqs.length) lines.push(`FAQ aprovada:\n${product.faqs.map((f) => `- ${f.question} → ${f.answer}`).join("\n")}`);

  return lines.join("\n");
}

/** Bloco de voz/regras da marca pronto pra prompt — GET /v1/brand/context. */
export async function brandContextBlock(): Promise<string> {
  const b = await getBrand();
  const globalForbidden = await prisma.claim.findMany({ where: { scope: "GLOBAL", type: "FORBIDDEN" } });
  const lines: string[] = ["# Voz e regras da marca Élyx Nutrition"];
  if (b.purpose) lines.push(`Propósito: ${b.purpose}`);
  if (b.persona) lines.push(`Pra quem fala: ${b.persona}`);
  if (b.voiceRules) lines.push(`Tom de voz: ${b.voiceRules}`);
  if (b.monicaRules) lines.push(`Uso da Mônica Wagner: ${b.monicaRules}`);
  if (b.ctaRules) lines.push(`CTA e cupom: ${b.ctaRules}`);
  if (b.allowedVocab.length) lines.push(`Vocabulário permitido: ${b.allowedVocab.join(", ")}.`);
  if (b.bannedTerms.length) lines.push(`Termos proibidos (globais): ${b.bannedTerms.join(", ")}.`);
  if (globalForbidden.length) lines.push(`Claims proibidos (globais): ${globalForbidden.map((c) => c.text).join(", ")}.`);
  if (b.disclaimers) lines.push(`Disclaimers obrigatórios: ${b.disclaimers}`);
  return lines.join("\n");
}
