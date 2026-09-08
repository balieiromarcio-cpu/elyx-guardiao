import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IconCheck, IconAlert } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TarefasPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  const [pendentes, concluidas] = await Promise.all([
    prisma.reviewTask.findMany({ where: { status: "PENDENTE" }, orderBy: { createdAt: "desc" }, include: { product: true } }),
    prisma.reviewTask.findMany({ where: { status: "CONCLUIDA" }, orderBy: { resolvedAt: "desc" }, take: 30, include: { product: true } }),
  ]);

  async function resolve(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/dashboard/tarefas");
    await prisma.reviewTask.update({ where: { id: String(formData.get("id")) }, data: { status: "CONCLUIDA", resolvedAt: new Date(), resolvedBy: s.user.name ?? s.user.email } });
    redirect("/dashboard/tarefas");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Correção continua humana</p>
        <h1 className="h1 mt-1">Tarefas de revisão</h1>
        <p className="lede mt-1">Abertas sozinhas quando um fato citado muda. O Guardião acha o conteúdo afetado; corrigir é sempre de alguém.</p>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Pendentes ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma tarefa aberta.</p>
        ) : (
          <div className="space-y-3">
            {pendentes.map((t) => (
              <div key={t.id} className="flex items-start gap-3 rounded-lg border border-line-2 bg-surface-2 p-3">
                <IconAlert size={16} className="mt-0.5 shrink-0 text-warn" />
                <div className="flex-1 text-sm">
                  <p>{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.systemsAffected.map((sys) => <span key={sys} className="badge badge-muted">{sys}</span>)}
                  </div>
                  {t.product && <Link href={`/dashboard/produtos/${t.product.slug}`} className="mt-1 inline-block text-xs text-accent hover:underline">abrir ficha do produto</Link>}
                  <p className="mt-1 text-[11px] text-muted">aberta em {t.createdAt.toLocaleString("pt-BR")}</p>
                </div>
                {isAdmin && (
                  <form action={resolve}><input type="hidden" name="id" value={t.id} /><button type="submit" className="btn btn-secondary btn-xs"><IconCheck size={12} /> concluída</button></form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {concluidas.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Concluídas recentemente</h2>
          <ul className="space-y-1 text-xs text-muted">
            {concluidas.map((t) => (
              <li key={t.id}>{t.description} — resolvida por {t.resolvedBy} em {t.resolvedAt?.toLocaleDateString("pt-BR")}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
