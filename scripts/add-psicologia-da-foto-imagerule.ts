import "dotenv/config";
import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * PSICOLOGIA DA FOTO — decisão do Marcio (08/09/2026), gravada no imageRules do Guia da marca (fonte única da
 * identidade; o Sidney lê daqui em toda etapa: Redator, diretor de arte, designer de layout, Guardião da imagem
 * e revisor do conjunto). Nasceu do teste de 08/09: a foto "mulher cansada, sem maquiagem, jogada na cama" parecia
 * IA mesmo com pele e luz perfeitas — porque nenhuma mulher tiraria/postaria essa foto. Uma mulher postando
 * "acabei de acordar" nunca mostra o rosto. Aditivo e idempotente.
 * Opcional: passe o caminho de uma imagem aprovada pra entrar como print de referência ("Post que gostei").
 * Uso: npx tsx scripts/add-psicologia-da-foto-imagerule.ts [imagem-aprovada.png] [rótulo]
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const MARK = "PSICOLOGIA DA FOTO (decisão do Marcio 08/09/2026";

const LINES = [
  `${MARK} — vale por cima de qualquer descrição de cena):`,
  "1. AUTOR E MOTIVO: toda foto precisa de um autor plausível e de um motivo pra existir. Antes de descrever a cena, responda: quem tirou esta foto? por que ela deixaria publicar? o que ela escolheu NÃO mostrar? Se a resposta a 'deixaria publicar?' for não, a cena está errada — muda-se o modo, não o pixel.",
  "2. A MULHER ÉLYX NUNCA É FLAGRADA: ela decide o que mostra. Quanto mais íntimo o momento (acordar, banho, noite, cansaço), MENOS rosto — de costas, silhueta, mãos, objetos, ambiente. Rosto só em foto que ela faria de propósito: arrumada, ciente da câmera, com dignidade.",
  "3. A DOR FICA NO TEXTO. A foto mostra dignidade ou a METÁFORA da dor (a xícara de café fria, a cama desfeita vazia, o relógio, a luz da janela) — nunca o sintoma no rosto ou no corpo (cansaço, olheira, cabelo caindo, pele, tristeza). Foto de sintoma é estética de farmácia; a Élyx é o feed dela.",
  "4. MODOS PERMITIDOS: SILHUETA/DE COSTAS (janela, contraluz, reflexo) · METÁFORA/STILL LIFE (sem pessoa) · DETALHE (mãos, tecido, objeto) · RETRATO EDITORIAL (ela sabe que está sendo fotografada: roupa escolhida, cabelo feito, olhar pra fora ou pra câmera) · GESTO COM PROPÓSITO (prendendo o cabelo, vestindo o casaco, servindo o café) · BELEZA PRODUZIDA (só com print de referência aprovado). PROIBIDO: deitada olhando pra câmera; 'sem maquiagem, jogada'; rosto cansado ou triste; close de sintoma; pose de catálogo; flagrante sem autor.",
  "5. VARIEDADE: peças seguidas não repetem o mesmo modo nem o mesmo cenário — o feed não pode ser 'mulher no quarto' toda semana.",
  "6. FOTO DE VERDADE, NÃO RENDER: uma única fonte de luz com direção (uma direção de sombra), lente e ponto de foco definidos, tons de filme (Portra) sem borda de filme, imperfeições nomeadas (poros, linhas de expressão, fios soltos, assimetria), enquadramento levemente fora do centro. Nunca 'perfect', 'flawless', 'cinematic', 'editorial polish', '8K', 'studio'.",
];

async function main() {
  const [imagePath, labelArg] = process.argv.slice(2);
  const b = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const current = b.imageRules ?? "";
  if (current.includes(MARK)) {
    console.log("regra já existe — nada alterado.");
  } else {
    const next = `${current.trimEnd()}\n${LINES.join("\n")}`;
    await prisma.brand.update({ where: { id: "default" }, data: { imageRules: next, updatedBy: "add-psicologia-da-foto-imagerule (08/09/2026)" } });
    await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field: "imageRules", oldValue: current.slice(0, 500), newValue: next.slice(0, 500), origin: "MANUAL", changedBy: "add-psicologia-da-foto-imagerule" } });
    console.log("Psicologia da foto gravada no imageRules.");
  }
  if (imagePath) {
    const label = labelArg ?? "Post que gostei — gerado pelo Sidney e aprovado pelo Marcio (08/09/2026): silhueta em contraluz na janela, 'acabei de acordar' sem mostrar o rosto";
    const dup = await prisma.asset.findFirst({ where: { productId: null, type: "reference", label } });
    if (dup) { console.log("print de referência já existe — nada alterado."); return; }
    const buf = readFileSync(imagePath);
    const blob = await put(`brand/liked-posts/sidney-silhueta-janela.png`, buf, { access: "public", contentType: "image/png", addRandomSuffix: true });
    const asset = await prisma.asset.create({ data: { productId: null, type: "reference", blobUrl: blob.url, label } });
    await prisma.changeLog.create({ data: { entity: "Asset", entityId: asset.id, field: "criado", oldValue: null, newValue: label, origin: "MANUAL", changedBy: "add-psicologia-da-foto-imagerule" } });
    console.log(`print de referência criado: ${blob.url} (${Math.round(buf.length / 1024)} KB)`);
  }
}
main().finally(() => prisma.$disconnect());
