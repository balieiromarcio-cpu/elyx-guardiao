import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const SOURCE_NOTE =
  "IMPORTADO DA COPY DO SITE elyxnutrition.com.br em 06/09/2026 — NÃO confirmado com o rótulo físico. " +
  "Este texto é comercial (Shopify), não fato de rótulo; serve de ponto de partida pra você auditar e, quando " +
  "confirmar com o rótulo real, propor a próxima versão com a foto anexada.";

// FAQ genérica repetida em todas as páginas do site (vira Faq de marca, productId nulo — evita 6x duplicar por produto).
const GENERIC_FAQ: { question: string; answer: string }[] = [
  { question: "O produto tem garantia?", answer: "A garantia de 60 dias é válida apenas para o kit com 6 frascos. Para as demais opções de compra, o prazo de garantia segue o Código de Defesa do Consumidor. Essa é uma forma de incentivar o uso completo e oferecer ainda mais segurança para você." },
  { question: "Quantos frascos devo adquirir?", answer: "Recomendamos o combo com 6 frascos. Ele oferece o menor custo por unidade, ativa a garantia estendida de 60 dias e ainda dá acesso aos bônus exclusivos. É a melhor escolha para obter resultados consistentes." },
  { question: "O valor é cobrado uma única vez?", answer: "Sim! A compra é 100% única e segura. Você paga uma única vez pelo seu pedido — sem mensalidades, sem taxas escondidas e sem renovação automática." },
  { question: "Política de envio", answer: "Todos os pedidos são despachados em 1 dia útil após a compra." },
  { question: "Em quanto tempo começo a ver resultados?", answer: "Muitas mulheres relatam melhorias na energia e bem-estar já nas primeiras semanas. Mas os resultados mais profundos costumam aparecer após 30 a 60 dias de uso contínuo." },
  { question: "Para quem são indicados os produtos da ÉLYX?", answer: "A linha ÉLYX foi pensada e desenvolvida para a mulher madura, que precisa e busca cada vez mais produtos exclusivos." },
];

type ProductData = {
  slug: string;
  dosage: string;
  packaging: string | null;
  ingredients: string[];
  warnings: string;
  facts: string;
  faqQuestion: string; // a pergunta específica de contraindicação
  faqAnswer: string;
  image: string;
  pageUrl: string;
};

const PRODUCTS: ProductData[] = [
  {
    slug: "vitaly",
    dosage: "2 cápsulas ao dia, junto ao café da manhã ou ao almoço.",
    packaging: null,
    ingredients: ["Extrato de semente de feno-grego (Trigonella foenum-graecum L.)", "Bisglicinato de magnésio", "Bitartarato de colina", "L-arginina", "Taurina", "Tetraborato de sódio decahidratado (boro)", "Extrato de pinho marítimo (Pinus pinaster Aiton)", "Bisglicinato ferroso", "Acetato de DL-alfa-tocoferol (vitamina E)", "Niacinamida (vitamina B3)", "Bisglicinato de zinco", "L-selenometionina (selênio)", "Riboflavina (vitamina B2)", "Cloridrato de piridoxina (vitamina B6)", "Acetato de retinol (vitamina A)", "Cianocobalamina (vitamina B12)"],
    warnings: "Contém amido de milho, antiumectante (dióxido de silício INS 551), espessante estearato de magnésio (INS-470 III). Composição da cápsula: gelatina/colágeno bovino. Não contém glúten e não contém lactose. Alérgicos: pode conter derivados de crustáceos (caranguejo), soja e pinoli (Pinus spp.).",
    facts: "Vitalidade, equilíbrio hormonal e reconexão com o prazer feminino — cuidado nutricional contínuo pra mulher madura, combina ativos vegetais e minerais que apoiam o equilíbrio hormonal, a circulação e a energia. Feno-grego, boro e pinho marítimo são citados como os 3 ativos principais no site.",
    faqQuestion: "O Vitaly tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes, quem faz uso de anticoagulantes e crianças não devem utilizar este produto. Também não recomendamos o uso para pacientes oncológicos, devido à sensibilidade do período de tratamento.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/vitaly_bc8f94b6-bd86-486b-8350-e299f33a5d59.png?v=1771253118&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/vitaly-1",
  },
  {
    slug: "hair_nails",
    dosage: "2 cápsulas ao dia, junto a uma das três principais refeições.",
    packaging: null,
    ingredients: ["Metilsulfonilmetano (MSM)", "D-Metionina", "L-Cisteína", "Vitamina C", "Quercetina", "Ferro Bisglicinato", "Zinco Bisglicinato", "Ácido Hialurônico", "Ácido Ortosilícico estabilizado em Cloreto de Colina", "L-Triptofano", "Coenzima Q10", "Vitamina E", "Vitamina B3", "Vitamina B5", "Vitamina B2", "Vitamina B1", "Cobre Bisglicinato", "Selênio Bisglicinato", "Cromo Bisglicinato", "Vitamina A", "Vitamina B9", "Vitamina B7", "Vitamina D3", "Vitamina B12"],
    warnings: "Contém amido de milho, antiumectante (dióxido de silício INS 551), espessante estearato de magnésio (INS-470 III). Composição da cápsula: colágeno bovino. Não contém glúten e não contém lactose. Alérgicos: pode conter derivados de crustáceos (caranguejo), soja e pinoli (Pinus spp.).",
    facts: "Fortalece a beleza natural, combatendo a queda de cabelo e o enfraquecimento das unhas — estímulo ao crescimento saudável dos fios e firmeza das unhas.",
    faqQuestion: "O Hair & Nails tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/1_hair_e_nails.png?v=1771456055&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/hair-e-nails-1",
  },
  {
    slug: "cartivita",
    dosage: "2 cápsulas ao dia, junto a uma das três principais refeições.",
    packaging: null,
    ingredients: ["Cloridrato de Glucosamina", "Sulfato de Condroitina", "MSM", "Extrato de Rizoma de Cúrcuma (Curcuma longa)", "Colágeno tipo II", "Vitamina D3", "Vitamina K2"],
    warnings: "Contém amido de milho, antiumectante (dióxido de silício INS 551), espessante estearato de magnésio (INS-470 III). Composição da cápsula: colágeno bovino. Não contém glúten e não contém lactose. Alérgicos: pode conter derivados de crustáceos (caranguejo), soja e pinoli (Pinus spp.).",
    facts: "Movimento sem dor e preservação da liberdade física — ação anti-inflamatória natural, fortalecimento ósseo/muscular e manutenção da saúde da cartilagem.",
    faqQuestion: "O Cartivita tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/8e0e43b4e237504f1bbefcb98563c6eb.webp?v=1769622068&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/cartivita-1",
  },
  {
    slug: "skin_up",
    dosage: "2 cápsulas ao dia, junto com o jantar.",
    packaging: null,
    ingredients: ["Vitamina C", "Extrato de Pinho Marítimo (Pinus pinaster)", "Extrato de Polpa de Oliva (Olea europaea)", "Quercetina", "Trans-Resveratrol", "Vitamina E", "Zinco Bisglicinato", "Astaxantina", "Silício Bisglicinato", "Vitamina A"],
    warnings: "Contém amido de milho, antiumectante (dióxido de silício INS 551), espessante estearato de magnésio (INS-470 III). Composição da cápsula: colágeno bovino. Não contém glúten e não contém lactose. Alérgicos: pode conter derivados de crustáceos (caranguejo), soja e pinoli (Pinus spp.).",
    facts: "ATENÇÃO NA AUDITORIA: o site NÃO cita \"hidroxitirosol\" — o ativo listado é \"Extrato de Polpa de Oliva\" (fonte natural de hidroxitirosol, mas não o composto isolado nomeado). Confirme com o rótulo qual é o termo correto antes de qualquer conteúdo citar hidroxitirosol. Regeneração estética: luminosidade, firmeza, controle de melasma e manchas.",
    faqQuestion: "O Skin-up tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/2a719a149ba6203b3d4dde821530c15b.webp?v=1769608304&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/skin-up-1",
  },
  {
    slug: "redux3",
    dosage: "2 cápsulas ao dia, junto ao café da manhã ou ao almoço.",
    packaging: null,
    ingredients: ["Extrato de Rizoma de Cúrcuma (Curcuma longa)", "Bitartarato de Colina", "Extrato de Laranja Moro (Citrus sinensis)", "Espirulina", "FOS (frutooligossacarídeo)", "L-Triptofano", "L-Teanina", "Vitamina C", "Café Verde", "Coenzima Q10", "Vitamina B3", "Vitamina D3", "Vitamina B12"],
    warnings: "Contém amido de milho, antiumectante (dióxido de silício INS 551), espessante estearato de magnésio (INS-470 III). Composição da cápsula: colágeno bovino. Não contém glúten e não contém lactose. Alérgicos: pode conter derivados de crustáceos (caranguejo), soja e pinoli (Pinus spp.).",
    facts: "Triptofano reduz vontade de doces, café verde aumenta o metabolismo, laranja moro atua na queima de gordura — modulação metabólica e redução de gordura abdominal.",
    faqQuestion: "O Redux-3 tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/6accbfc204f1816d7d6feb0d53691693.webp?v=1769608296&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/redux3-1",
  },
  {
    slug: "coq10",
    dosage: "2 cápsulas ao dia, junto a uma das três principais refeições.",
    packaging: null,
    ingredients: ["Triglicerídeos de Cadeia Média (TCM)", "Coenzima Q10", "Acetato de DL Alfa Tocoferol (vitamina E)", "Lecitina (emulsificante INS 322(i))"],
    warnings: "Cápsula: água purificada, gelatina, glicerol, xarope de sorbitol, corante carmim INS 120, dióxido de titânio INS 171. Contém amido de milho, antiumectante, espessante. Não contém glúten e não contém lactose. Contém derivados de soja. Pode conter peixe.",
    facts: "Energia vital e clareza mental, proteção antioxidante e cuidado cardiovascular. Confirma o que já sabíamos: é TCM (triglicerídeos de cadeia média), NÃO é ubiquinol — nenhuma menção a ubiquinol no site.",
    faqQuestion: "A Coenzima Q10 tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/2a498b0a69d13992a43638a0459cb4b4_67f2f940-b347-4af6-a0a7-a7906194a8b3.png?v=1769627044&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/coenzima",
  },
  {
    slug: "creatina",
    dosage: "Junto a uma das três principais refeições, ou logo após o treino (o site não especifica gramas por dose — confirme no rótulo).",
    packaging: "300g",
    ingredients: ["Creatina Monohidratada (micronizada, alta pureza)"],
    warnings: "Livre de aditivos, sódio ou corantes, segundo o site. Contraindicada pra quem tem comprometimento renal pré-existente.",
    facts: "Explosão de força e preservação de massa magra; tecnologia de micronização (partículas 50% mais finas) reduz retenção hídrica/inchaço comparado a creatinas comuns, segundo o site.",
    faqQuestion: "A creatina tem contraindicações?",
    faqAnswer: "Por precaução, pacientes com problemas ou comprometimentos renais pré-existentes não devem consumir creatina.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/1_coenzima.png?v=1771454903&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/creatina-1",
  },
  {
    slug: "melatonina_gummy",
    dosage: "1 cápsula/gummy ao dia, logo após o jantar.",
    packaging: "120g",
    ingredients: ["Melatonina", "Isomalto-oligossacarídeo de tapioca", "Ácido cítrico", "Aroma natural de maracujá", "Betacaroteno (corante natural)", "Maltitol", "Xarope de maltitol", "Pectina", "Glicerina"],
    warnings: "Não contém glúten.",
    facts: "Auxilia no sono e relaxamento noturno, reduz cansaço ao acordar.",
    faqQuestion: "A Melatonina tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes, crianças e pessoas envolvidas em atividades que requerem atenção constante não devem consumir o produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/first.png?v=1778345612&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/melatonina",
  },
  {
    slug: "magnesio_prime",
    dosage: "3 cápsulas ao dia, preferencialmente junto ao jantar ou última refeição.",
    packaging: null,
    ingredients: ["Bisglicinato de magnésio", "Dimagnésio malato", "Menaquinona-7 (vitamina K2)", "Cloreto de magnésio", "Colecalciferol (vitamina D3)"],
    warnings: "Contém silicato de magnésio, antiumectante dióxido de silício, estabilizante celulose microcristalina. Composição da cápsula: gelatina. Alérgicos: pode conter derivados de soja, peixe, crustáceos (caranguejo), amendoim, amêndoa, avelã, castanha de caju, castanha do Brasil, macadâmias, nozes, pistache e castanhas. Não contém glúten.",
    facts: "Apoia energia, força muscular, saúde óssea e bem-estar — magnésio + D3 + K2.",
    faqQuestion: "O Magnésio Prime tem contraindicações?",
    faqAnswer: "Por precaução, gestantes, lactantes e crianças não devem utilizar este produto.",
    image: "http://elyxnutrition.com.br/cdn/shop/files/9_magnesio.png?v=1781371235&width=2048",
    pageUrl: "https://elyxnutrition.com.br/products/magnesio",
  },
];

async function main() {
  // FAQ genérica da marca (uma vez só, não repetida por produto)
  for (const f of GENERIC_FAQ) {
    const exists = await prisma.faq.findFirst({ where: { productId: null, question: f.question } });
    if (!exists) await prisma.faq.create({ data: { productId: null, question: f.question, answer: f.answer, approved: false } });
  }
  console.log(`FAQ genérica da marca: ${GENERIC_FAQ.length} pergunta(s) semeada(s) (rascunho, não aprovada).`);

  let created = 0;
  let skipped = 0;
  for (const p of PRODUCTS) {
    const product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!product) {
      console.log(`${p.slug}: produto não encontrado no banco — pulado.`);
      skipped++;
      continue;
    }
    const already = await prisma.productVersion.findFirst({ where: { productId: product.id } });
    if (already) {
      console.log(`${p.slug}: já tem versão — pulado (não sobrescrevo).`);
      skipped++;
      continue;
    }

    await prisma.productVersion.create({
      data: {
        productId: product.id,
        versionNumber: 1,
        status: "VIGENTE",
        effectiveFrom: new Date(),
        dosage: p.dosage,
        packaging: p.packaging,
        warnings: p.warnings,
        facts: `${p.facts}\n\n${SOURCE_NOTE}`,
        documentUrl: null,
        proposedBy: "importação automática (site oficial)",
        approvedBy: "importação automática — AGUARDA AUDITORIA de Marcio/Enzo com o rótulo físico",
        approvedAt: new Date(),
        ingredients: { create: p.ingredients.map((name, idx) => ({ name, order: idx })) },
      },
    });

    await prisma.product.update({ where: { id: product.id }, data: { status: "ATIVO" } });

    await prisma.faq.create({ data: { productId: product.id, question: p.faqQuestion, answer: p.faqAnswer, approved: false } });

    await prisma.evidence.create({ data: { productId: product.id, title: "Página oficial do produto (fonte da importação)", url: p.pageUrl, note: "Copy vigente no site em 06/09/2026 — usada pra pré-popular esta ficha." } });

    await prisma.asset.create({ data: { productId: product.id, type: "photo", blobUrl: p.image, sourceUrl: p.pageUrl, label: "Foto do produto (site)", isPrimary: true } });

    await prisma.reviewTask.create({
      data: {
        description: `${product.name}: ficha importada da copy do site (sem foto de rótulo). Confirme ingredientes/dosagem com o rótulo físico e proponha a versão 2 com o documento anexado.`,
        productId: product.id,
        systemsAffected: ["equipe Élyx (Marcio/Enzo)"],
      },
    });

    await prisma.changeLog.create({
      data: { entity: "ProductVersion", entityId: product.id, field: "ficha criada", oldValue: null, newValue: "versão 1, importada do site, aguardando auditoria", origin: "IMPORT", changedBy: "importação automática" },
    });

    console.log(`${p.slug}: versão 1 criada (VIGENTE, aguardando auditoria) + FAQ + evidência + foto + tarefa de revisão.`);
    created++;
  }

  console.log(`\nConcluído: ${created} produto(s) populado(s), ${skipped} pulado(s).`);
}

main()
  .catch((e) => console.error("ERRO:", e))
  .finally(() => prisma.$disconnect());
