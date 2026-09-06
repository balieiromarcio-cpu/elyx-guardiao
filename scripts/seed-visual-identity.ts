import "dotenv/config";
import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Semente da identidade visual (06/09/2026) — roda UMA vez, só preenche o que está vazio.
 * Fonte dos valores: apresentação oficial "Círculo Integrativo Élyx" (fontes embutidas no PDF:
 * TAN Aegean nos títulos, Agrandir no texto) e o símbolo dourado do logo (cor amostrada do PNG:
 * #D8A860). Bordô/verde/creme foram lidos da apresentação a olho — confirmar no Guia da marca.
 * Também sobe o símbolo do logo em PNG transparente como Asset "logo" (o PDF não renderiza).
 */
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const IMAGE_RULES = [
  "COMO É: fotografia editorial realista, luz natural suave, pele com textura real, mulher brasileira de 40 a 55 anos com expressão serena e confiante (nunca caricata, nunca 'modelo de banco de imagem sorrindo pra câmera').",
  "CENÁRIO: ambiente doméstico brasileiro claro e sofisticado (cozinha, varanda, quarto, banheiro com madeira clara, cerâmica, linho, plantas). Paleta creme + bordô discreto + dourado quente; verde-escuro e azul-marinho só como fundo sólido de lâmina, nunca na cena.",
  "PRODUTO: só aparece quando a peça é de produto, e SEMPRE a partir da foto oficial (frasco âmbar, tampa dourada, rótulo com o lótus) — a IA não redesenha rótulo, cor nem tampa.",
  "TEXTO NA LÂMINA: título na fonte de título (serifa alta, elegante), texto na fonte de texto (sans geométrica limpa). Caixa creme com filete dourado quando o texto vai sobre foto. Logo = símbolo do lótus dourado.",
  "NUNCA: antes/depois, balança, fita métrica, comprimidos espalhados, corpo 'fitness' hipersexualizado, jaleco de médico, texto/letra/marca d'água gerados pela IA, mulher jovem (20-30) representando a leitora, estética de farmácia ou de academia.",
  "Origem destas regras: lidas da apresentação oficial e do print de referência em 06/09/2026 — ajuste aqui, o Sidney passa a obedecer na próxima geração.",
].join("\n");

async function main() {
  const brand = await prisma.brand.findUniqueOrThrow({ where: { id: "default" } });
  const data: Record<string, string> = {};
  const fill = (k: keyof typeof brand, v: string) => { if (!brand[k]) data[k as string] = v; };
  fill("colorPrimary", "#6B1F2B");
  fill("colorSecondary", "#1F3B32");
  fill("colorBackground", "#F3ECDF");
  fill("colorAccent", "#D8A860");
  fill("colorText", "#2B2B2B");
  fill("fontDisplay", "TAN Aegean");
  fill("fontBody", "Agrandir");
  fill("imageRules", IMAGE_RULES);
  if (Object.keys(data).length) {
    await prisma.brand.update({ where: { id: "default" }, data: { ...data, updatedBy: "seed-visual-identity (06/09/2026)" } });
    for (const [field, newValue] of Object.entries(data)) {
      await prisma.changeLog.create({ data: { entity: "Brand", entityId: "default", field, oldValue: null, newValue: newValue.slice(0, 500), origin: "MANUAL", changedBy: "seed-visual-identity" } });
    }
    console.log("Identidade visual preenchida:", Object.keys(data).join(", "));
  } else console.log("Identidade visual já preenchida — nada alterado.");

  const hasPngLogo = await prisma.asset.findFirst({ where: { productId: null, type: "logo", blobUrl: { endsWith: ".png" } } });
  if (!hasPngLogo) {
    const png = readFileSync("public/logo-mark.png");
    const blob = await put("brand/logo-simbolo-dourado.png", png, { access: "public", contentType: "image/png", addRandomSuffix: true });
    const asset = await prisma.asset.create({ data: { productId: null, type: "logo", blobUrl: blob.url, label: "Símbolo do logo — lótus dourado, PNG transparente (extraído do PDF oficial)", isPrimary: true } });
    await prisma.changeLog.create({ data: { entity: "Asset", entityId: asset.id, field: "criado", oldValue: null, newValue: asset.label, origin: "MANUAL", changedBy: "seed-visual-identity" } });
    console.log("Logo PNG subido:", blob.url);
  } else console.log("Logo PNG já existe:", hasPngLogo.blobUrl);
}
main().finally(() => prisma.$disconnect());
