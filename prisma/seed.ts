import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { CANONICAL_PRODUCTS } from "../src/lib/products-seed";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "elyxnutrition@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "TrocarSenha123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: passwordHash, name: "Marcio (Admin)", role: "ADMIN" },
  });
  console.log(`Admin criado/confirmado: ${email}`);

  await prisma.brand.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      purpose: "Suplementos premium pra mulher 40+ — vitalidade, autoestima e bem-estar na fase da vida em que ela está.",
      persona: "Mulher 40+, no climatério ou perimenopausa, que quer se sentir bem e ter energia — não uma paciente, uma protagonista.",
      bannedTerms: ["milagre", "sem efeitos colaterais", "comprovado cientificamente", "compra de olhos fechados", "subindo pelas paredes"],
      allowedVocab: ["auxilia", "contribui", "apoia", "ajuda na manutenção", "faz parte de uma rotina", "fórmula com ativos reconhecidos", "bem-estar", "vitalidade"],
      voiceRules:
        "Só cite ativo, forma, dosagem, embalagem ou tecnologia que esteja na ficha vigente do Guardião. Se a ficha não diz, o conteúdo não diz. Nunca cite marca de matéria-prima que não esteja na ficha. Nunca prometa resultado em prazo. Nunca fale código de cupom (o link já carrega o desconto).",
      disclaimers: "Este produto não é um medicamento e não substitui uma alimentação equilibrada. Consulte um profissional de saúde antes de iniciar o uso.",
    },
  });
  console.log("Guia da marca (Brand) criado/confirmado.");

  // Catálogo canônico — só identidade. Nunca sobrescreve produto já existente
  // (evita apagar shopHandle atualizado por importação/webhook).
  for (const p of CANONICAL_PRODUCTS) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, name: p.name, shopHandle: p.shopHandle, status: "RASCUNHO" },
    });
  }
  console.log(`${CANONICAL_PRODUCTS.length} produtos semeados (identidade — sem ficha ainda).`);

  // Fatos que JÁ custaram um erro público — travados como Claim proibido desde o dia 1,
  // não dependem de ninguém lembrar (ver memória "CoQ10 Élyx não é ubiquinol" e o caso Libifem).
  const vitaly = await prisma.product.findUnique({ where: { slug: "vitaly" } });
  const coq10 = await prisma.product.findUnique({ where: { slug: "coq10" } });
  const guardrails: { productId: string; text: string; note: string }[] = [
    ...(vitaly ? [{ productId: vitaly.id, text: "Libifem", note: "Libifem é marca de feno-grego que a Élyx não usa — nunca citar (06/09/2026)." }] : []),
    ...(coq10 ? [{ productId: coq10.id, text: "ubiquinol", note: "O CoQ10 Élyx não é ubiquinol; usa TCM em vez dos óleos comuns — só a ficha vigente define ativo/forma/dosagem (05/09/2026)." }] : []),
    ...(coq10 ? [{ productId: coq10.id, text: "forma ativa", note: "Não afirmar 'forma ativa' sem base na ficha vigente." }] : []),
  ];
  for (const g of guardrails) {
    const already = await prisma.claim.findFirst({ where: { productId: g.productId, text: g.text, type: "FORBIDDEN" } });
    if (!already) await prisma.claim.create({ data: { scope: "PRODUCT", productId: g.productId, type: "FORBIDDEN", text: g.text, note: g.note, createdBy: "seed" } });
  }
  console.log(`${guardrails.length} claim(s) proibido(s) de guarda-corpo semeado(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
