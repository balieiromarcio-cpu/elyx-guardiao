import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Regras de imagem = só restrições fixas. O ESTILO vem dos prints "Post que gostei" (o Sidney deriva o
 * guia deles com visão computacional e os envia como referência à IA e ao revisor). Sobrescreve o campo
 * imageRules do Guia da marca (fica no changelog; edite na tela depois).
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const IMAGE_RULES = [
  "A BASE SÃO OS PRINTS: o estilo (modelo, figurino, cenário, luz, paleta, enquadramento) é o dos posts 'Post que gostei' carregados aqui — o Sidney extrai o guia deles automaticamente e os envia como referência. Estas linhas são só restrições fixas por cima.",
  "PRODUTO: só quando a peça é de produto, e SEMPRE a partir da foto oficial (frasco âmbar, tampa dourada, rótulo com o lótus). A IA não redesenha rótulo, cor nem tampa.",
  "ESPAÇO PARA O TEXTO: parede lisa, lençol, céu ou fundo desfocado no TERÇO SUPERIOR (4:5) ou na metade esquerda (16:9), sem sombra forte, objeto ou rosto ali — o template escreve o título nesse espaço.",
  "NUNCA na imagem: texto, letra, logotipo ou marca d'água gerados pela IA; antes/depois; balança; fita métrica; comprimidos espalhados; mão com cápsula na boca; jaleco; academia; farmácia; estética de suplemento masculino; pessoa deformada (mãos, dentes, olhos).",
].join("\n");

async function main() {
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  await prisma.brand.update({ where: { id: "default" }, data: { imageRules: IMAGE_RULES, updatedBy: "update-image-rules (06/09/2026)" } });
  await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "imageRules", oldValue: (b.imageRules ?? "").slice(0, 500), newValue: IMAGE_RULES.slice(0, 500), origin: "MANUAL", changedBy: "update-image-rules" } });
  console.log("imageRules atualizado: só restrições fixas; estilo vem dos prints.");
}
main().finally(() => prisma.$disconnect());
