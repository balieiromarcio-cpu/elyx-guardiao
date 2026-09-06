import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { IconBox, IconCheck, IconAlert } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const { todos } = await searchParams;
  const showAll = todos === "1";

  const STATUS_ORDER = { ATIVO: 0, RASCUNHO: 1, DESCONTINUADO: 2 } as const;

  const [rawProducts, ignoredCount] = await Promise.all([
    prisma.product.findMany({
      where: showAll ? {} : { ignored: false },
      orderBy: { name: "asc" },
      include: { versions: { where: { status: "VIGENTE" } }, shopifyMirror: true },
    }),
    prisma.product.count({ where: { ignored: true } }),
  ]);
  // Ativos primeiro — status do enum não ordena do jeito que a gente quer na tela.
  const products = [...rawProducts].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">Catálogo Élyx</p>
          <h1 className="h1 mt-1">Produtos</h1>
          <p className="lede mt-1">
            A ficha vigente de cada produto — fórmula, rótulo, claims e o espelho comercial da Shopify. É daqui que 007,
            Sidney, o portal e qualquer agente futuro tiram o fato certo pela API.
          </p>
        </div>
        {ignoredCount > 0 && (
          <Link href={showAll ? "/dashboard/produtos" : "/dashboard/produtos?todos=1"} className="btn btn-ghost btn-sm">
            {showAll ? "ocultar ignorados" : `mostrar ${ignoredCount} ignorado(s)`}
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => {
          const vigente = p.versions[0];
          return (
            <Link key={p.id} href={`/dashboard/produtos/${p.slug}`} className={`card card-hover flex flex-col gap-3 p-4 ${p.ignored ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-3"><IconBox size={16} className="text-muted" /></span>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.slug}</p>
                  </div>
                </div>
                <span className={`badge ${p.ignored ? "badge-muted" : p.status === "ATIVO" ? "badge-ok" : p.status === "DESCONTINUADO" ? "badge-muted" : "badge-warn"}`}>
                  {p.ignored ? "ignorado" : p.status.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {vigente ? (
                  <span className="inline-flex items-center gap-1 text-ok"><IconCheck size={12} /> ficha vigente (v{vigente.versionNumber})</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warn"><IconAlert size={12} /> sem ficha ainda</span>
                )}
              </div>
              {p.shopifyMirror && (
                <p className="text-xs text-muted">
                  {p.shopifyMirror.price ? `R$ ${Number(p.shopifyMirror.price).toFixed(2)}` : "sem preço"} · {p.shopifyMirror.status ?? "—"}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
