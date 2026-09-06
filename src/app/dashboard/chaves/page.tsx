import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-auth";
import crypto from "crypto";
import { IconTrash, IconKey } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ChavesPage({ searchParams }: { searchParams: Promise<{ newKey?: string; newSecret?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const { newKey, newSecret } = await searchParams;

  const [keys, subs] = await Promise.all([
    prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.webhookSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  async function createKey(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    const consumer = String(formData.get("consumer") ?? "").trim();
    if (!consumer) redirect("/dashboard/chaves");
    const { raw, hash, preview } = generateApiKey();
    await prisma.apiKey.upsert({
      where: { consumer },
      update: { keyHash: hash, keyPreview: preview, revokedAt: null },
      create: { consumer, keyHash: hash, keyPreview: preview },
    });
    redirect(`/dashboard/chaves?newKey=${encodeURIComponent(raw)}`);
  }

  async function revokeKey(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    await prisma.apiKey.update({ where: { id: String(formData.get("id")) }, data: { revokedAt: new Date() } }).catch(() => null);
    redirect("/dashboard/chaves");
  }

  async function createSubscriber(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    const consumer = String(formData.get("consumer") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!consumer || !url) redirect("/dashboard/chaves");
    const secret = crypto.randomBytes(24).toString("hex");
    await prisma.webhookSubscriber.create({ data: { consumer, url, secret } });
    redirect(`/dashboard/chaves?newSecret=${encodeURIComponent(secret)}`);
  }

  async function removeSubscriber(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    await prisma.webhookSubscriber.delete({ where: { id: String(formData.get("id")) } }).catch(() => null);
    redirect("/dashboard/chaves");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Portas do Guardião</p>
        <h1 className="h1 mt-1">Chaves e assinantes</h1>
        <p className="lede mt-1">Uma chave por sistema consumidor (007, Sidney, portal, agentes futuros) pra ler /v1/*. Assinantes recebem aviso quando algo muda.</p>
      </div>

      {newKey && (
        <div className="card border-accent/50 p-4">
          <p className="text-sm font-semibold text-accent-2">Chave criada — copie agora, ela não é mostrada de novo:</p>
          <code className="mt-2 block break-all rounded-md bg-surface-2 p-3 text-xs">{newKey}</code>
          <p className="mt-2 text-xs text-muted">Use em &quot;Authorization: Bearer &lt;chave&gt;&quot; nas chamadas a /v1/*.</p>
        </div>
      )}
      {newSecret && (
        <div className="card border-accent/50 p-4">
          <p className="text-sm font-semibold text-accent-2">Secret do webhook criado — copie agora:</p>
          <code className="mt-2 block break-all rounded-md bg-surface-2 p-3 text-xs">{newSecret}</code>
          <p className="mt-2 text-xs text-muted">O corpo de cada evento vem assinado em HMAC-SHA256 no header X-Guardiao-Signature.</p>
        </div>
      )}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Chaves de leitura (API)</h2>
        <form action={createKey} className="mb-3 flex flex-wrap items-end gap-2">
          <input name="consumer" placeholder="ex: elyx-007" className="input w-56" required />
          <button type="submit" className="btn btn-primary btn-sm"><IconKey size={13} /> gerar chave</button>
        </form>
        <div className="space-y-1">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
              <span className="font-medium">{k.consumer}</span>
              <span className="text-xs text-muted">…{k.keyPreview}</span>
              <span className={`badge ${k.revokedAt ? "badge-muted" : "badge-ok"}`}>{k.revokedAt ? "revogada" : "ativa"}</span>
              <span className="ml-auto text-xs text-muted">{k.lastUsedAt ? `usada em ${k.lastUsedAt.toLocaleString("pt-BR")}` : "nunca usada"}</span>
              {!k.revokedAt && <form action={revokeKey}><input type="hidden" name="id" value={k.id} /><button type="submit" className="btn btn-ghost btn-xs px-1 text-danger"><IconTrash size={12} /></button></form>}
            </div>
          ))}
          {keys.length === 0 && <p className="text-xs text-muted">Nenhuma chave criada ainda.</p>}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinantes de eventos (webhooks)</h2>
        <form action={createSubscriber} className="mb-3 flex flex-wrap items-end gap-2">
          <input name="consumer" placeholder="ex: elyx-sidney" className="input w-48" required />
          <input name="url" placeholder="https://…/api/webhooks/guardiao" className="input flex-1 min-w-[240px]" required />
          <button type="submit" className="btn btn-secondary btn-sm">adicionar</button>
        </form>
        <div className="space-y-1">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
              <span className="font-medium">{sub.consumer}</span>
              <span className="truncate text-xs text-muted">{sub.url}</span>
              <span className={`badge ${sub.active ? "badge-ok" : "badge-muted"}`}>{sub.active ? "ativo" : "inativo"}</span>
              <span className="ml-auto text-xs text-muted">{sub.lastStatus ? `último: ${sub.lastStatus}` : "sem entregas ainda"}</span>
              <form action={removeSubscriber}><input type="hidden" name="id" value={sub.id} /><button type="submit" className="btn btn-ghost btn-xs px-1 text-danger"><IconTrash size={12} /></button></form>
            </div>
          ))}
          {subs.length === 0 && <p className="text-xs text-muted">Nenhum assinante ainda.</p>}
        </div>
      </section>
    </div>
  );
}
