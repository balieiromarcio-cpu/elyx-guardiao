import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * NAC Élyx — ficha oficial a partir do RÓTULO enviado pelo Marcio no chat (09/09/2026, foto da embalagem).
 * Rótulo aprovado = verdade do produto. Cria o produto (não existia no Guardião) com a versão 1 VIGENTE,
 * a tabela nutricional impressa e os claims proibidos de sempre pro tema (detox / fígado / cura).
 * Idempotente: se já existir versão vigente do NAC, não faz nada.
 * Uso: npx tsx scripts/add-nac-label.ts
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  let product = await prisma.product.findUnique({ where: { slug: "nac" } });
  if (!product) {
    product = await prisma.product.create({ data: { slug: "nac", name: "NAC", status: "ATIVO" } });
    console.log("produto criado:", product.slug);
  }
  const vigente = await prisma.productVersion.findFirst({ where: { productId: product.id, status: "VIGENTE" } });
  if (vigente) {
    console.log(`já existe versão vigente (v${vigente.versionNumber}) — nada a fazer`);
    return;
  }
  const now = new Date();
  const version = await prisma.productVersion.create({
    data: {
      productId: product.id,
      versionNumber: 1,
      status: "VIGENTE",
      effectiveFrom: now,
      dosage: "Ingerir 1 cápsula ao dia. Indicação: indivíduos com idade igual ou superior a 19 anos.",
      packaging: "30 cápsulas · porção 0,75 g (1 cápsula) · 30 porções por embalagem. Cápsula vegetal de hidroxipropilmetilcelulose (HPMC) com corante natural clorofila.",
      warnings: "NÃO CONTÉM GLÚTEN. Não contém quantidades significativas de valor energético, carboidratos, açúcares, proteínas, gorduras, fibras e sódio. Suplemento alimentar não substitui alimentação equilibrada nem orientação profissional.",
      facts: [
        "Fórmula do rótulo: N-acetil L-cisteína (fornece 600 mg de L-cisteína por cápsula), selenometionina (selênio 68 mcg = 113% VD) e molibdato de sódio (molibdênio 45 mcg = 100% VD); antiumectante dióxido de silício.",
        "Diferenciais REAIS pra comunicar: o selênio e o molibdênio não são enfeite — selênio é cofator de enzimas antioxidantes (glutationa peroxidase) e o molibdênio participa do metabolismo dos aminoácidos sulfurados (a cisteína é um deles). Ou seja: a fórmula entrega o precursor (NAC) e os dois minerais ligados ao mesmo caminho. Dizer isso como mecanismo, nunca como promessa.",
        "O que NÃO dizer: 'detox', 'desintoxica o fígado', 'limpa', 'cura', 'trata', 'remédio', prazo de efeito, kg. Posicionamento aprovado: NAC é precursor da glutationa, o antioxidante que o corpo fabrica e que cai com a idade — entrada pelo mecanismo, não pelo medo.",
        `Registrado pelo Sidney em ${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} a partir da foto do rótulo enviada pelo Marcio no chat. Falta subir a foto do rótulo como documento desta versão.`,
      ].join("\n\n"),
      proposedBy: "Sidney (rótulo enviado pelo Marcio no chat, 09/09/2026)",
      approvedBy: "Marcio (Admin) — rótulo físico",
      approvedAt: now,
      ingredients: {
        create: [
          { order: 1, name: "L-Cisteína (de N-acetil L-cisteína)", quantity: "600", unit: "mg", dailyValuePercent: null },
          { order: 2, name: "Molibdênio (molibdato de sódio)", quantity: "45", unit: "mcg", dailyValuePercent: "100" },
          { order: 3, name: "Selênio (selenometionina)", quantity: "68", unit: "mcg", dailyValuePercent: "113" },
        ],
      },
    },
  });
  console.log(`versão v${version.versionNumber} VIGENTE criada com 3 ingredientes`);

  const forbidden = ["detox", "desintoxica", "desintoxicação", "limpa o fígado", "protege o fígado", "cura", "trata", "tratamento", "remédio", "resultado em X dias", "emagrece"];
  for (const text of forbidden) {
    const exists = await prisma.claim.findFirst({ where: { productId: product.id, type: "FORBIDDEN", text } });
    if (!exists) await prisma.claim.create({ data: { scope: "PRODUCT", productId: product.id, type: "FORBIDDEN", text, note: "NAC — Always Fit vende 'detox/fígado'; a Élyx entra pelo mecanismo (precursor da glutationa). Registrado 09/09/2026.", createdBy: "Sidney", approved: true } });
  }
  console.log(`${forbidden.length} claims proibidos garantidos`);

  await prisma.changeLog.create({ data: { origin: "MANUAL", entity: "Product", entityId: product.id, field: "ficha", oldValue: null, newValue: "v1 VIGENTE a partir do rótulo físico (foto enviada pelo Marcio em 09/09/2026): NAC 600 mg de L-cisteína, selênio 68 mcg (113% VD), molibdênio 45 mcg (100% VD), 1 cápsula/dia, ≥ 19 anos, sem glúten.", changedBy: "Sidney", approvedBy: "Marcio (Admin)" } }).catch((e) => console.warn("changelog não gravado:", e instanceof Error ? e.message : e));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
