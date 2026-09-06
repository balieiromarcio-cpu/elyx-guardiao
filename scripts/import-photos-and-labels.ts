import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { put } from "@vercel/blob";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

type Ing = { name: string; quantity?: string; unit?: string; dailyValuePercent?: string };

type ProductPlan = {
  slug: string;
  nutritionImageIndex: number; // índice da foto que é a tabela nutricional real
  dosage: string;
  packaging: string;
  ingredients: Ing[];
  factsNote: string;
};

const PLANS: ProductPlan[] = [
  {
    slug: "vitaly",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 2 g).",
    packaging: "60 cápsulas · 1.000 mg · peso líq. 60 g · 30 porções por embalagem.",
    ingredients: [
      { name: "Vitamina A", quantity: "600", unit: "µg", dailyValuePercent: "75" },
      { name: "Vitamina E", quantity: "10", unit: "mg", dailyValuePercent: "67" },
      { name: "Vitamina B2", quantity: "1", unit: "mg", dailyValuePercent: "83" },
      { name: "Vitamina B3", quantity: "16", unit: "mg", dailyValuePercent: "107" },
      { name: "Vitamina B6", quantity: "1", unit: "mg", dailyValuePercent: "77" },
      { name: "Vitamina B12", quantity: "2", unit: "µg", dailyValuePercent: "83" },
      { name: "Ferro", quantity: "7", unit: "mg", dailyValuePercent: "50" },
      { name: "Magnésio", quantity: "70", unit: "mg", dailyValuePercent: "17" },
      { name: "Selênio", quantity: "34", unit: "µg", dailyValuePercent: "57" },
      { name: "Zinco", quantity: "2", unit: "mg", dailyValuePercent: "19" },
      { name: "Colina", quantity: "86", unit: "mg", dailyValuePercent: "16" },
      { name: "Taurina", quantity: "100", unit: "mg" },
      { name: "Saponinas (do feno-grego)", quantity: "450", unit: "mg" },
      { name: "Arginina", quantity: "104", unit: "mg" },
      { name: "Boro", quantity: "8,866", unit: "mg" },
      { name: "Procianidinas (do pinho marítimo)", quantity: "50", unit: "mg" },
    ],
    factsNote: "Vitalidade, equilíbrio hormonal e reconexão com o prazer feminino — cuidado nutricional contínuo pra mulher madura.",
  },
  {
    slug: "hair_nails",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 1 g).",
    packaging: "30 porções por embalagem.",
    ingredients: [
      { name: "L-Cisteína", quantity: "110", unit: "mg" },
      { name: "D-Metionina", quantity: "110", unit: "mg" },
      { name: "Metilsulfonilmetano (MSM)", quantity: "200", unit: "mg" },
      { name: "L-Triptofano", quantity: "50", unit: "mg" },
      { name: "Coenzima Q10", quantity: "40", unit: "mg" },
      { name: "Ácido Ortosilícico estabilizado em Cloreto de Colina (Silício)", quantity: "50", unit: "mg" },
      { name: "Ácido Hialurônico", quantity: "50", unit: "mg" },
      { name: "Quercetina", quantity: "100", unit: "mg" },
      { name: "Vitamina A (Retinol)", quantity: "800", unit: "mcg", dailyValuePercent: "100" },
      { name: "Vitamina E (Tocoferol)", quantity: "15", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina C (Ác. Ascórbico)", quantity: "100", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina D3 (Colecalciferol)", quantity: "15", unit: "mcg", dailyValuePercent: "100" },
      { name: "Vitamina B1 (Tiamina)", quantity: "1,2", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina B2 (Riboflavina)", quantity: "1,2", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina B3 (Niacina)", quantity: "15", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina B5 (Pantotenato de Cálcio)", quantity: "5", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina B7 (Biotina)", quantity: "45", unit: "mcg", dailyValuePercent: "150" },
      { name: "Vitamina B9 (Ác. Fólico)", quantity: "400", unit: "mcg", dailyValuePercent: "100" },
      { name: "Vitamina B12 (Cobalamina)", quantity: "2,4", unit: "mcg", dailyValuePercent: "100" },
      { name: "Zinco", quantity: "11", unit: "mg", dailyValuePercent: "100" },
      { name: "Cobre", quantity: "900", unit: "mcg", dailyValuePercent: "100" },
      { name: "Selênio", quantity: "60", unit: "mcg", dailyValuePercent: "100" },
      { name: "Cromo", quantity: "35", unit: "mcg", dailyValuePercent: "100" },
      { name: "Ferro", quantity: "14", unit: "mg", dailyValuePercent: "100" },
    ],
    factsNote: "Fortalece a beleza natural, combatendo a queda de cabelo e o enfraquecimento das unhas.",
  },
  {
    slug: "cartivita",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 1 g). Indicado para maiores de 19 anos. Não exceder a recomendação diária.",
    packaging: "30 porções por embalagem. Conservar ao abrigo da luz, calor e umidade. Após aberto, consumir em até 60 dias.",
    ingredients: [
      { name: "Colágeno tipo II", quantity: "40", unit: "mg" },
      { name: "Vitamina D3 (Colecalciferol)", quantity: "50", unit: "mcg", dailyValuePercent: "333" },
      { name: "Vitamina K2 (Menaquinona)", quantity: "120", unit: "mcg", dailyValuePercent: "100" },
      { name: "Extrato de Rizoma de Cúrcuma (Curcumina)", quantity: "130", unit: "mg" },
      { name: "Glucosamina", quantity: "200", unit: "mg" },
      { name: "Condroitina", quantity: "200", unit: "mg" },
      { name: "Metilsulfonilmetano (MSM)", quantity: "200", unit: "mg" },
    ],
    factsNote: "Movimento sem dor e preservação da liberdade física — ação anti-inflamatória natural.",
  },
  {
    slug: "skin_up",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 1 g). Indicado para maiores de 19 anos. Não exceder a recomendação diária.",
    packaging: "30 porções por embalagem. Conservar ao abrigo da luz, calor e umidade. Após aberto, consumir em até 60 dias.",
    ingredients: [
      { name: "Extrato de Pinho Marítimo (Procianidinas)", quantity: "200", unit: "mg" },
      { name: "Quercetina", quantity: "100", unit: "mg" },
      { name: "Extrato de Polpa de Oliva (Hidroxitirosol)", quantity: "200", unit: "mg" },
      { name: "Vitamina E (Tocoferol)", quantity: "30", unit: "mg", dailyValuePercent: "200" },
      { name: "Vitamina A (Retinol)", quantity: "800", unit: "mcg", dailyValuePercent: "100" },
      { name: "Astaxantina", quantity: "4", unit: "mg" },
      { name: "Zinco", quantity: "11", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina C (Ác. Ascórbico)", quantity: "200", unit: "mg", dailyValuePercent: "200" },
      { name: "Trans-Resveratrol", quantity: "50", unit: "mg" },
      { name: "Silício", quantity: "2,5", unit: "mg" },
    ],
    factsNote: "CONFIRMADO na tabela nutricional real: o ativo é \"Extrato de Polpa de Oliva\", e o rótulo cita hidroxitirosol entre parênteses — corrige a dúvida levantada na primeira importação (a copy do site não citava o nome, mas o rótulo cita). Regeneração estética: luminosidade, firmeza, controle de melasma e manchas.",
  },
  {
    slug: "redux3",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 1 g). Indicado para maiores de 19 anos. Não exceder a recomendação diária.",
    packaging: "30 porções por embalagem.",
    ingredients: [
      { name: "Extrato de Rizoma de Cúrcuma (Curcumina)", quantity: "100", unit: "mg" },
      { name: "Colina", quantity: "100", unit: "mg", dailyValuePercent: "18" },
      { name: "Extrato de Laranja Moro (Antocianinas)", quantity: "100", unit: "mg" },
      { name: "Espirulina (Arthrospira platensis)", quantity: "100", unit: "mg" },
      { name: "Frutooligossacarídeos (FOS)", quantity: "100", unit: "mg" },
      { name: "L-Triptofano", quantity: "100", unit: "mg" },
      { name: "L-Teanina", quantity: "100", unit: "mg" },
      { name: "Vitamina B3 (Niacina)", quantity: "15", unit: "mg", dailyValuePercent: "100" },
      { name: "Vitamina B12 (Cobalamina)", quantity: "9", unit: "mcg", dailyValuePercent: "375" },
      { name: "Vitamina D3 (Colecalciferol)", quantity: "2000", unit: "UI", dailyValuePercent: "333" },
      { name: "Vitamina C (Ác. Ascórbico)", quantity: "100", unit: "mg", dailyValuePercent: "100" },
      { name: "Café Verde (Ác. Clorogênico)", quantity: "100", unit: "mg" },
      { name: "Coenzima Q10", quantity: "50", unit: "mg" },
    ],
    factsNote: "Triptofano reduz vontade de doces, café verde aumenta o metabolismo, laranja moro atua na queima de gordura.",
  },
  {
    slug: "coq10",
    nutritionImageIndex: 3,
    dosage: "2 cápsulas ao dia (porção de 1,4 g). Indicado para maiores de 19 anos. Não exceder a recomendação diária.",
    packaging: "30 porções por embalagem.",
    ingredients: [
      { name: "Coenzima Q10", quantity: "200", unit: "mg" },
      { name: "Vitamina E", quantity: "15", unit: "mg", dailyValuePercent: "100" },
      { name: "Triglicerídeos de Cadeia Média (TCM)", unit: "veículo lipídico da fórmula" },
    ],
    factsNote: "Confirma o que já sabíamos: é TCM (triglicerídeos de cadeia média), NÃO é ubiquinol — a tabela real não cita ubiquinol.",
  },
  {
    slug: "creatina",
    nutritionImageIndex: 3,
    dosage: "1 medida dosadora (3 g) ao dia, junto a uma refeição ou logo após o treino.",
    packaging: "300 g · 100 porções por embalagem (100 doses de 3 g).",
    ingredients: [{ name: "Creatina Monohidratada", quantity: "3000", unit: "mg" }],
    factsNote: "Confirma o pacote: 300g / 100 doses de 3g. Explosão de força e preservação de massa magra; tecnologia de micronização reduz retenção hídrica comparado a creatinas comuns, segundo o site.",
  },
  {
    slug: "melatonina_gummy",
    nutritionImageIndex: 4,
    dosage: "1 gummy ao dia, logo após o jantar (porção de 4 g).",
    packaging: "30 unidades · peso líq. 120 g · sabor maracujá.",
    ingredients: [
      { name: "Melatonina", quantity: "0,21", unit: "mg" },
      { name: "Carboidratos (do gummy)", quantity: "2,1", unit: "g", dailyValuePercent: "1" },
    ],
    factsNote: "Auxilia no sono e relaxamento noturno, reduz cansaço ao acordar.",
  },
  {
    slug: "magnesio_prime",
    nutritionImageIndex: 3,
    dosage: "3 cápsulas ao dia, preferencialmente junto ao jantar ou última refeição (porção de 1,5 g).",
    packaging: "30 porções por embalagem.",
    ingredients: [
      { name: "Vitamina D3 (Colecalciferol)", quantity: "50", unit: "µg", dailyValuePercent: "333" },
      { name: "Vitamina K2 (Menaquinona)", quantity: "120", unit: "µg", dailyValuePercent: "100" },
      { name: "Magnésio (bisglicinato, malato e cloreto)", quantity: "350", unit: "mg", dailyValuePercent: "83" },
    ],
    factsNote: "Apoia energia, força muscular, saúde óssea e bem-estar — magnésio + D3 + K2. A tabela reporta o magnésio total; o rótulo cita a mistura de bisglicinato, malato e cloreto de magnésio.",
  },
];

async function uploadToBlob(url: string, pathHint: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`falha ao baixar ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = url.split("?")[0].split(".").pop() || "png";
  const blob = await put(`product-photos/${pathHint}.${ext}`, buf, { access: "public", addRandomSuffix: true, contentType: `image/${ext === "jpg" ? "jpeg" : ext}` });
  return blob.url;
}

async function main() {
  for (const plan of PLANS) {
    const product = await prisma.product.findUnique({ where: { slug: plan.slug }, include: { shopifyMirror: true } });
    if (!product || !product.shopifyMirror) {
      console.log(`${plan.slug}: sem produto/mirror — pulado.`);
      continue;
    }
    const images = (product.shopifyMirror.images as { id: number; src: string }[]) ?? [];
    if (images.length === 0) {
      console.log(`${plan.slug}: sem imagens no mirror — pulado.`);
      continue;
    }

    // Remove o asset único que a importação do site tinha criado (link direto pro CDN do site,
    // não hospedado no nosso Blob) — vamos substituir pela galeria completa da Shopify.
    await prisma.asset.deleteMany({ where: { productId: product.id, type: "photo" } });

    let nutritionBlobUrl: string | null = null;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const blobUrl = await uploadToBlob(img.src, `${plan.slug}/${i}`);
      const isNutrition = i === plan.nutritionImageIndex;
      await prisma.asset.create({
        data: {
          productId: product.id,
          type: "photo",
          blobUrl,
          sourceUrl: img.src,
          label: isNutrition ? "Tabela nutricional (foto real do produto)" : i === 0 ? "Foto principal (Shopify)" : `Foto ${i + 1} (Shopify)`,
          isPrimary: i === 0,
        },
      });
      if (isNutrition) nutritionBlobUrl = blobUrl;
      console.log(`${plan.slug}: foto ${i + 1}/${images.length} enviada${isNutrition ? " (TABELA NUTRICIONAL)" : ""}.`);
    }

    // Encerra a v1 (baseada em copy do site) e cria a v2 com dados reais da tabela nutricional.
    const v1 = await prisma.productVersion.findFirst({ where: { productId: product.id, status: "VIGENTE" } });
    if (v1) {
      await prisma.productVersion.update({ where: { id: v1.id }, data: { status: "ENCERRADA", effectiveTo: new Date() } });
    }

    await prisma.productVersion.create({
      data: {
        productId: product.id,
        versionNumber: (v1?.versionNumber ?? 0) + 1,
        status: "VIGENTE",
        effectiveFrom: new Date(),
        dosage: plan.dosage,
        packaging: plan.packaging,
        documentUrl: nutritionBlobUrl,
        facts: `${plan.factsNote}\n\nATUALIZADO em 06/09/2026 a partir da FOTO REAL da tabela nutricional impressa na embalagem (uma das fotos de produto da Shopify) — não é mais só copy do site. Ainda recomendável Marcio/Enzo conferirem rapidamente com o produto físico em mãos antes de considerar definitivo, mas esta já é a informação nutricional impressa.`,
        proposedBy: "importação de fotos do produto (Shopify)",
        approvedBy: "importação automática — tabela nutricional real, AGUARDA confirmação final de Marcio/Enzo",
        approvedAt: new Date(),
        ingredients: { create: plan.ingredients.map((ing, idx) => ({ name: ing.name, quantity: ing.quantity, unit: ing.unit, dailyValuePercent: ing.dailyValuePercent, order: idx })) },
      },
    });

    await prisma.changeLog.create({
      data: {
        entity: "ProductVersion",
        entityId: product.id,
        field: "ficha atualizada com tabela nutricional real",
        oldValue: "versão 1 (copy do site)",
        newValue: "versão 2 (foto real da tabela nutricional)",
        origin: "IMPORT",
        changedBy: "importação automática (fotos Shopify)",
      },
    });

    await prisma.reviewTask.create({
      data: {
        description: `${product.name}: ficha atualizada com a tabela nutricional real (foto do produto, não mais copy do site). Recomendado: conferir rapidamente com a embalagem física antes de considerar definitivo.`,
        productId: product.id,
        systemsAffected: ["equipe Élyx (Marcio/Enzo)"],
      },
    });

    console.log(`${plan.slug}: versão 2 criada com dados reais da tabela nutricional.\n`);
  }
}

main()
  .catch((e) => console.error("ERRO:", e))
  .finally(() => prisma.$disconnect());
