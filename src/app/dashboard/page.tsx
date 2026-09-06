import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { shopifyConfigured } from "@/lib/shopify";
import { isEmailConfigured } from "@/lib/email";
import { IconAlert, IconCheck, IconExternal } from "@/components/icons";

export default async function OverviewPage() {
  const [products, versionsVigentes, pendingTasks, recentChanges, apiKeys, shopifyOk] = await Promise.all([
    prisma.product.findMany({ where: { ignored: false }, orderBy: { name: "asc" } }),
    prisma.productVersion.count({ where: { status: "VIGENTE", product: { ignored: false } } }),
    prisma.reviewTask.findMany({ where: { status: "PENDENTE" }, orderBy: { createdAt: "desc" }, take: 5, include: { product: true } }),
    prisma.changeLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.apiKey.count({ where: { revokedAt: null } }),
    shopifyConfigured(),
  ]);

  const semFicha = products.length - versionsVigentes;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Guardião Élyx</p>
        <h1 className="h1 mt-1">Visão geral</h1>
        <p className="lede mt-1">
          O rótulo aprovado é a verdade do produto. A Shopify é a verdade comercial. Aqui é a verdade da marca — e a
          cópia oficial das duas outras. Nenhum outro sistema digita fato, só lê.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produtos" value={products.length} />
        <StatCard label="Com ficha vigente" value={versionsVigentes} warn={semFicha > 0} hint={semFicha > 0 ? `${semFicha} sem ficha ainda` : undefined} />
        <StatCard label="Tarefas de revisão abertas" value={pendingTasks.length} warn={pendingTasks.length > 0} />
        <StatCard label="Chaves de API ativas" value={apiKeys} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Integrações</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <IntegrationRow label="Shopify (comercial)" ok={shopifyOk} hint="preço, estoque, variantes — webhook + reconciliação diária" />
            <IntegrationRow label="E-mail de aviso (Resend)" ok={isEmailConfigured()} hint="avisa a equipe quando um fato citado muda" />
          </ul>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tarefas de revisão pendentes</h2>
            <Link href="/dashboard/tarefas" className="text-xs text-accent hover:underline">ver todas</Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-xs text-muted">Nenhuma tarefa aberta.</p>
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <IconAlert size={14} className="mt-0.5 shrink-0 text-warn" />
                  <span>{t.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Últimas mudanças</h2>
          <Link href="/dashboard/changelog" className="text-xs text-accent hover:underline">ver changelog completo</Link>
        </div>
        {recentChanges.length === 0 ? (
          <p className="text-xs text-muted">Nada registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recentChanges.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="badge badge-muted">{c.entity}</span>
                <span className="font-medium">{c.field}</span>
                <span className="text-muted">{c.oldValue ?? "—"} → {c.newValue ?? "—"}</span>
                <span className="ml-auto text-xs text-muted">{c.origin.toLowerCase()} · {c.createdAt.toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted">
        Desenho de referência:{" "}
        <a href="https://claude.ai/code/artifact/4b36bf47-2003-4c78-8335-37701adb6136" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          Manual Élyx <IconExternal size={11} />
        </a>
      </p>
    </div>
  );
}

function StatCard({ label, value, warn, hint }: { label: string; value: number; warn?: boolean; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="kicker">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${warn ? "text-warn" : "text-fg"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function IntegrationRow({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <IconCheck size={14} className="mt-0.5 shrink-0 text-ok" /> : <IconAlert size={14} className="mt-0.5 shrink-0 text-muted" />}
      <div>
        <p className={ok ? "text-fg" : "text-muted"}>{label} {ok ? "" : "— não configurado"}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </li>
  );
}
