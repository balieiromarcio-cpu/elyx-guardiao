import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchAllShopifyProducts, shopifyConfigured, shopifyConnectionInfo, registerShopifyWebhooks } from "@/lib/shopify";
import { upsertShopifyMirror } from "@/lib/shopify-sync";
import { headers } from "next/headers";
import { IconCheck, IconAlert } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { ok, erro } = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  const users = isAdmin ? await prisma.user.findMany({ orderBy: { createdAt: "asc" } }) : [];
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const shopifyConn = await shopifyConnectionInfo();

  async function changePassword(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("next") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (next.length < 10) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("A nova senha precisa ter pelo menos 10 caracteres."));
    if (next !== confirm) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("A confirmação não bate com a nova senha."));
    const user = await prisma.user.findUnique({ where: { id: s.user.id } });
    if (!user || !(await bcrypt.compare(current, user.password))) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("Senha atual incorreta."));
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(next, 10) } });
    redirect("/dashboard/configuracoes?ok=" + encodeURIComponent("Senha alterada."));
  }

  async function createUser(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    const name = String(formData.get("name") ?? "").trim();
    const role = formData.get("role") === "ADMIN" ? "ADMIN" : "TEAM";
    const tempPassword = String(formData.get("tempPassword") ?? "").trim();
    if (!email.includes("@") || !name || tempPassword.length < 8) {
      redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("Preencha nome, e-mail e uma senha provisória de 8+ caracteres."));
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.removedAt) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent(`${email} já tem acesso.`));
    await prisma.user.upsert({
      where: { email },
      update: { name, role, password: await bcrypt.hash(tempPassword, 10), removedAt: null },
      create: { email, name, role, password: await bcrypt.hash(tempPassword, 10) },
    });
    redirect("/dashboard/configuracoes?ok=" + encodeURIComponent(`${name} pode entrar com a senha provisória — peça pra trocar no primeiro acesso.`));
  }

  async function removeUser(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    const id = String(formData.get("id"));
    if (id === s.user.id) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("Você não pode remover seu próprio acesso."));
    await prisma.user.update({ where: { id }, data: { removedAt: new Date() } }).catch(() => null);
    redirect("/dashboard/configuracoes?ok=" + encodeURIComponent("Acesso removido."));
  }

  async function importShopify() {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    if (!(await shopifyConfigured())) redirect("/dashboard/configuracoes?erro=" + encodeURIComponent("Conecte a Shopify primeiro (instale o app pela Shopify, ou cadastre SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_ACCESS_TOKEN na Vercel)."));
    // redirect() lança um sinal interno do Next (NEXT_REDIRECT) — nunca pode ficar dentro do
    // try/catch, senão o catch trata o próprio redirect como erro (bug já visto em produção).
    let query: string;
    try {
      const products = await fetchAllShopifyProducts();
      for (const p of products) await upsertShopifyMirror(p, "IMPORT");
      query = "ok=" + encodeURIComponent(`${products.length} produto(s) importado(s)/atualizado(s) da Shopify.`);
    } catch (e) {
      query = "erro=" + encodeURIComponent(e instanceof Error ? e.message : String(e));
    }
    redirect(`/dashboard/configuracoes?${query}`);
  }

  async function registerWebhooks() {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/login");
    const h2 = await headers();
    const base = `${h2.get("x-forwarded-proto") ?? "https"}://${h2.get("host")}`;
    let query: string;
    try {
      const results = await registerShopifyWebhooks(base);
      query = "ok=" + encodeURIComponent(results.map((r) => `${r.topic}: ${r.ok ? "ok" : "falhou"}`).join(" · "));
    } catch (e) {
      query = "erro=" + encodeURIComponent(e instanceof Error ? e.message : String(e));
    }
    redirect(`/dashboard/configuracoes?${query}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Guardião Élyx</p>
        <h1 className="h1 mt-1">Configurações</h1>
      </div>
      {ok && <p className="inline-flex items-center gap-1 rounded-md bg-ok/15 px-3 py-2 text-sm text-ok"><IconCheck size={13} /> {ok}</p>}
      {erro && <p className="inline-flex items-center gap-1 rounded-md bg-danger/15 px-3 py-2 text-sm text-danger"><IconAlert size={13} /> {erro}</p>}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Shopify</h2>
        <p className="mb-3 text-xs text-muted">
          {shopifyConn ? (
            <>Conectada: <code>{shopifyConn.shop}</code> {shopifyConn.via === "oauth" ? "(instalada pela Shopify)" : "(via env var)"}</>
          ) : (
            "Ainda não conectada — clique em \"Instalar app\" no Dev Dashboard da Shopify pra conectar."
          )}
          {" "}· webhook recebe em <code>{origin}/api/webhooks/shopify</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <form action={importShopify}><button type="submit" className="btn btn-secondary btn-sm">Importar produtos agora</button></form>
          <form action={registerWebhooks}><button type="submit" className="btn btn-secondary btn-sm">Registrar webhooks na Shopify</button></form>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Trocar minha senha</h2>
        <form action={changePassword} className="grid max-w-md gap-2">
          <input type="password" name="current" placeholder="senha atual" required className="input" />
          <input type="password" name="next" placeholder="nova senha (10+ caracteres)" required className="input" />
          <input type="password" name="confirm" placeholder="confirmar nova senha" required className="input" />
          <button type="submit" className="btn btn-secondary btn-sm w-fit">Trocar senha</button>
        </form>
      </section>

      {isAdmin && (
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Usuários</h2>
          <div className="mb-4 space-y-1">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted">{u.email}</span>
                <span className="badge badge-muted">{u.role === "ADMIN" ? "administrador" : "equipe"}</span>
                {u.removedAt && <span className="badge badge-danger">removido</span>}
                {!u.removedAt && u.id !== session.user.id && (
                  <form action={removeUser} className="ml-auto"><input type="hidden" name="id" value={u.id} /><button type="submit" className="btn btn-ghost btn-xs text-danger">remover</button></form>
                )}
              </div>
            ))}
          </div>
          <form action={createUser} className="grid max-w-lg gap-2">
            <input name="name" placeholder="nome" required className="input" />
            <input name="email" type="email" placeholder="e-mail" required className="input" />
            <input name="tempPassword" placeholder="senha provisória (8+ caracteres)" required className="input" />
            <select name="role" className="select" defaultValue="TEAM">
              <option value="TEAM">Equipe (propõe, não aprova)</option>
              <option value="ADMIN">Administrador (aprova fato de rótulo/claim)</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm w-fit">Criar acesso</button>
          </form>
        </section>
      )}
    </div>
  );
}
