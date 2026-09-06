import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveVersion } from "@/lib/versioning";
import { VersionEditor } from "@/components/version-editor";
import { IconExternal, IconCheck, IconAlert, IconTrash } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, include: { ingredients: { orderBy: { order: "asc" } } } },
      claims: { orderBy: { createdAt: "desc" } },
      faqs: { orderBy: { createdAt: "desc" } },
      shopifyMirror: true,
    },
  });
  if (!product) notFound();

  const vigente = product.versions.find((v) => v.status === "VIGENTE");
  const propostas = product.versions.filter((v) => v.status === "PROPOSTA");
  const historico = product.versions.filter((v) => v.status === "ENCERRADA");
  const isAdmin = session.user.role === "ADMIN";

  async function approveAction(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect(`/dashboard/produtos/${slug}`);
    await approveVersion(String(formData.get("versionId")), s.user.name ?? s.user.email ?? "admin");
    redirect(`/dashboard/produtos/${slug}`);
  }

  async function discardAction(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const versionId = String(formData.get("versionId"));
    const v = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (v && v.status === "PROPOSTA") await prisma.productVersion.delete({ where: { id: versionId } });
    redirect(`/dashboard/produtos/${slug}`);
  }

  async function addClaim(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const text = String(formData.get("text") ?? "").trim();
    const type = formData.get("type") === "FORBIDDEN" ? "FORBIDDEN" : "ALLOWED";
    if (!text) redirect(`/dashboard/produtos/${slug}`);
    await prisma.claim.create({ data: { scope: "PRODUCT", productId: product!.id, type, text, createdBy: s.user.name ?? s.user.email } });
    redirect(`/dashboard/produtos/${slug}`);
  }

  async function deleteClaim(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    await prisma.claim.delete({ where: { id: String(formData.get("id")) } }).catch(() => null);
    redirect(`/dashboard/produtos/${slug}`);
  }

  async function addFaq(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const question = String(formData.get("question") ?? "").trim();
    const answer = String(formData.get("answer") ?? "").trim();
    if (!question || !answer) redirect(`/dashboard/produtos/${slug}`);
    await prisma.faq.create({ data: { productId: product!.id, question, answer, approved: s.user.role === "ADMIN" } });
    redirect(`/dashboard/produtos/${slug}`);
  }

  async function toggleFaqApproval(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect(`/dashboard/produtos/${slug}`);
    const id = String(formData.get("id"));
    const faq = await prisma.faq.findUnique({ where: { id } });
    if (faq) await prisma.faq.update({ where: { id }, data: { approved: !faq.approved } });
    redirect(`/dashboard/produtos/${slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">{product.slug}</p>
          <h1 className="h1 mt-1">{product.name}</h1>
        </div>
        <span className={`badge ${product.status === "ATIVO" ? "badge-ok" : product.status === "DESCONTINUADO" ? "badge-muted" : "badge-warn"}`}>{product.status.toLowerCase()}</span>
      </div>

      {/* Comercial — espelho da Shopify, nunca editável aqui */}
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Comercial (Shopify)</h2>
          {product.shopHandle && (
            <a href={`https://elyxnutrition.com.br/products/${product.shopHandle}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
              editar na Shopify <IconExternal size={11} />
            </a>
          )}
        </div>
        {product.shopifyMirror ? (
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div><p className="label">Preço</p><p>{product.shopifyMirror.price ? `R$ ${Number(product.shopifyMirror.price).toFixed(2)}` : "—"}</p></div>
            <div><p className="label">Status na loja</p><p>{product.shopifyMirror.status ?? "—"}</p></div>
            <div><p className="label">Sincronizado em</p><p>{product.shopifyMirror.syncedAt.toLocaleString("pt-BR")}</p></div>
          </div>
        ) : (
          <p className="text-xs text-muted">Ainda não importado da Shopify. Rode a importação inicial em Configurações.</p>
        )}
      </section>

      {/* Ficha vigente */}
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Ficha vigente</h2>
        {vigente ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted">versão {vigente.versionNumber} · vigente desde {vigente.effectiveFrom.toLocaleDateString("pt-BR")} · aprovada por {vigente.approvedBy}</p>
            {vigente.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {vigente.ingredients.map((i) => (
                  <span key={i.id} className="badge badge-accent">{i.name}{i.quantity ? ` ${i.quantity}${i.unit ?? ""}` : ""}</span>
                ))}
              </div>
            )}
            {vigente.dosage && <p><span className="label">Posologia: </span>{vigente.dosage}</p>}
            {vigente.packaging && <p><span className="label">Embalagem: </span>{vigente.packaging}</p>}
            {vigente.warnings && <p><span className="label">Avisos: </span>{vigente.warnings}</p>}
            {vigente.facts && <p className="text-muted">{vigente.facts}</p>}
            {vigente.documentUrl && <a href={vigente.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">ver rótulo/laudo anexado <IconExternal size={11} /></a>}
          </div>
        ) : (
          <p className="inline-flex items-center gap-1 text-sm text-warn"><IconAlert size={13} /> sem ficha vigente — nenhum sistema deve afirmar ingrediente, dose ou embalagem deste produto ainda.</p>
        )}
        <div className="mt-3"><VersionEditor slug={product.slug} /></div>
      </section>

      {/* Propostas aguardando aprovação */}
      {propostas.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Propostas aguardando aprovação</h2>
          <div className="space-y-3">
            {propostas.map((v) => (
              <div key={v.id} className="rounded-lg border border-line-2 bg-surface-2 p-3 text-sm">
                <p className="text-xs text-muted">
                  versão {v.versionNumber} · vigência {v.effectiveFrom.toLocaleDateString("pt-BR")} · proposta por {v.proposedBy}
                  {v.approvedAt ? ` · aprovada por ${v.approvedBy}, aguardando a data` : " · aguardando aprovação"}
                </p>
                {v.ingredients.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {v.ingredients.map((i) => <span key={i.id} className="badge badge-muted">{i.name}{i.quantity ? ` ${i.quantity}${i.unit ?? ""}` : ""}</span>)}
                  </div>
                )}
                {v.documentUrl && <a href={v.documentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline">ver documento anexado <IconExternal size={11} /></a>}
                <div className="mt-2 flex gap-2">
                  {isAdmin && !v.approvedAt && (
                    <form action={approveAction}><input type="hidden" name="versionId" value={v.id} /><button type="submit" className="btn btn-primary btn-xs"><IconCheck size={12} /> aprovar</button></form>
                  )}
                  {!v.approvedAt && (
                    <form action={discardAction}><input type="hidden" name="versionId" value={v.id} /><button type="submit" className="btn btn-ghost btn-xs text-danger"><IconTrash size={12} /> descartar</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claims */}
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">O que pode e o que não pode dizer</h2>
        <form action={addClaim} className="mb-3 flex flex-wrap items-end gap-2">
          <select name="type" className="select w-40" defaultValue="ALLOWED">
            <option value="ALLOWED">Pode dizer</option>
            <option value="FORBIDDEN">Proibido</option>
          </select>
          <input name="text" placeholder="frase ou termo" className="input flex-1 min-w-[220px]" required />
          <button type="submit" className="btn btn-secondary btn-sm">adicionar</button>
        </form>
        <div className="space-y-1">
          {product.claims.length === 0 && <p className="text-xs text-muted">Nenhum claim cadastrado ainda.</p>}
          {product.claims.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <span className={`badge ${c.type === "ALLOWED" ? "badge-ok" : "badge-danger"}`}>{c.type === "ALLOWED" ? "pode" : "proibido"}</span>
              <span className="flex-1">{c.text}</span>
              {c.note && <span className="text-xs text-muted">{c.note}</span>}
              <form action={deleteClaim}><input type="hidden" name="id" value={c.id} /><button type="submit" className="btn btn-ghost btn-xs px-1"><IconTrash size={12} /></button></form>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Perguntas frequentes</h2>
        <form action={addFaq} className="mb-3 grid gap-2 sm:grid-cols-2">
          <input name="question" placeholder="pergunta" className="input" required />
          <input name="answer" placeholder="resposta aprovada" className="input" required />
          <button type="submit" className="btn btn-secondary btn-sm sm:col-span-2 sm:w-fit">adicionar</button>
        </form>
        <div className="space-y-2">
          {product.faqs.length === 0 && <p className="text-xs text-muted">Nenhuma FAQ ainda.</p>}
          {product.faqs.map((f) => (
            <div key={f.id} className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{f.question}</p>
                <span className={`badge ${f.approved ? "badge-ok" : "badge-warn"}`}>{f.approved ? "aprovada" : "rascunho"}</span>
              </div>
              <p className="mt-1 text-muted">{f.answer}</p>
              {isAdmin && (
                <form action={toggleFaqApproval} className="mt-2"><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn btn-ghost btn-xs">{f.approved ? "revogar aprovação" : "aprovar"}</button></form>
              )}
            </div>
          ))}
        </div>
      </section>

      {historico.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Histórico de versões</h2>
          <ul className="space-y-1 text-xs text-muted">
            {historico.map((v) => (
              <li key={v.id}>v{v.versionNumber} · vigorou {v.effectiveFrom.toLocaleDateString("pt-BR")} → {v.effectiveTo?.toLocaleDateString("pt-BR") ?? "—"}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
