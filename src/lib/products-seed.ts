/**
 * Catálogo canônico dos 10 produtos Élyx — slugs IDÊNTICOS aos do elyx-007
 * (src/lib/products.ts), pra migração e leitura por outros sistemas não quebrarem.
 * shopHandle é o identificador na Shopify (pode ser diferente do slug canônico).
 * Isto só semeia identidade (slug/nome/handle) — os FATOS de fórmula vivem em
 * ProductVersion, carregados por foto de rótulo (fase 1c) ou pela migração (fase 1b).
 */
export const CANONICAL_PRODUCTS: { slug: string; name: string; shopHandle: string | null }[] = [
  { slug: "vitaly", name: "Vitaly", shopHandle: "vitaly-1" },
  { slug: "hair_nails", name: "Hair & Nails", shopHandle: "hair-e-nails-1" },
  { slug: "cartivita", name: "Cartivita", shopHandle: "cartivita-1" },
  { slug: "skin_up", name: "Skin Up", shopHandle: "skin-up-1" },
  { slug: "redux3", name: "Redux3", shopHandle: "redux3-1" },
  { slug: "coq10", name: "CoQ10", shopHandle: "coenzima" },
  { slug: "creatina", name: "Creatina", shopHandle: "creatina-1" },
  { slug: "d3k2_gummy", name: "D3K2 Gummy", shopHandle: null },
  { slug: "melatonina_gummy", name: "Melatonina Gummy", shopHandle: "melatonina" },
  { slug: "magnesio_prime", name: "Magnésio Prime", shopHandle: "magnesio" },
];
