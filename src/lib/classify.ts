/**
 * Lista fixa de termos proibidos (regulatório ANVISA/CONAR + fatos de marca) — migrada do
 * elyx-007 (src/lib/classify.ts) em 06/09/2026. Agora o Guardião é a fonte única: o 007 e
 * qualquer outro sistema chamam POST /v1/compliance/check em vez de manter cópia própria.
 */
const BANNED_TERMS: { re: RegExp; label: string }[] = [
  { re: /\bcura(r|do|da)?\b/i, label: "cura" },
  { re: /\btrata(r|mento|mentos)?\b/i, label: "tratamento" },
  { re: /\bresolve(r)?\b/i, label: "resolve" },
  { re: /\belimina(r|do)?\b/i, label: "elimina" },
  { re: /\bgarantid[oa]s?\b/i, label: "garantido" },
  { re: /\bemagrece\b/i, label: "emagrece" },
  { re: /\bperca?\s+\d+\s*(kg|quilos?|cm)\b/i, label: "promessa em kg/cm" },
  { re: /\b\d+\s*(kg|quilos?)\s+em\s+\d+\s*(dias?|semanas?)\b/i, label: "kg em X dias" },
  { re: /\bmilagr(e|oso)\b/i, label: "milagre" },
  { re: /\bsem\s+efeito(s)?\s+colatera(l|is)\b/i, label: "sem efeitos colaterais" },
  { re: /\bcomprovad(o|a)\s+cientificamente\b/i, label: "comprovado cientificamente" },
  { re: /\b(cure|cures|treats?|treatment|guaranteed|lose\s+\d+\s*(lbs|pounds|kg))\b/i, label: "claim em inglês (cure/treat/guaranteed)" },
];

export function findComplianceFlags(text: string | null | undefined): string[] {
  if (!text) return [];
  const flags = new Set<string>();
  for (const { re, label } of BANNED_TERMS) if (re.test(text)) flags.add(label);
  return [...flags];
}
