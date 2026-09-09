import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBrand } from "@/lib/compliance";
import { logChange } from "@/lib/versioning";
import { dispatchEvent } from "@/lib/webhooks";
import { notifyTeam } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { AssetManager } from "@/components/asset-manager";
import { addBrandAsset, deleteBrandAsset } from "./actions";
import { IconExternal, IconTrash } from "@/components/icons";

export const dynamic = "force-dynamic";

const BRAND_FIELDS = ["purpose", "persona", "voiceRules", "monicaRules", "ctaRules", "disclaimers", "colorPrimary", "colorSecondary", "colorBackground", "colorAccent", "colorText", "fontDisplay", "fontBody", "imageRules"] as const;
const BRAND_LIST_FIELDS = ["allowedVocab", "bannedTerms"] as const;
const FIELD_LABELS: Record<string, string> = {
  purpose: "Propósito", persona: "Persona", voiceRules: "Tom de voz", monicaRules: "Uso da Mônica",
  ctaRules: "CTA e cupom", disclaimers: "Disclaimers", colorPrimary: "Cor primária", colorSecondary: "Cor secundária",
  colorBackground: "Cor de fundo", colorAccent: "Cor de destaque", colorText: "Cor do texto",
  fontDisplay: "Fonte de título", fontBody: "Fonte de texto", imageRules: "Regras de imagem",
  allowedVocab: "Vocabulário permitido", bannedTerms: "Termos proibidos",
};

function readBrandForm(formData: FormData) {
  const data: Record<string, unknown> = {};
  for (const f of BRAND_FIELDS) data[f] = String(formData.get(f) ?? "").trim() || null;
  for (const f of BRAND_LIST_FIELDS) data[f] = String(formData.get(f) ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  return data;
}

export default async function MarcaPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";
  const [brand, draft, assets, evidences] = await Promise.all([
    getBrand(),
    prisma.brandDraft.findUnique({ where: { id: "default" } }),
    prisma.asset.findMany({ where: { productId: null }, orderBy: { createdAt: "desc" } }),
    prisma.evidence.findMany({ where: { productId: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const { ok } = await searchParams;
  const fontFileNames = assets.filter((a) => /\.(ttf|otf|woff)(\?|$)/i.test(a.blobUrl)).map((a) => decodeURIComponent(a.blobUrl.split("/").pop() ?? ""));
  const draftChanges = draft
    ? [...BRAND_FIELDS, ...BRAND_LIST_FIELDS].filter((f) => {
        const b = brand as unknown as Record<string, unknown>;
        const d = draft as unknown as Record<string, unknown>;
        return Array.isArray(d[f]) ? JSON.stringify(d[f]) !== JSON.stringify(b[f] ?? []) : (d[f] ?? null) !== (b[f] ?? null);
      })
    : [];

  async function addEvidence(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const title = String(formData.get("title") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    if (!title) redirect("/dashboard/marca");
    await prisma.evidence.create({ data: { productId: null, title, url: url || null, note: note || null } });
    redirect("/dashboard/marca");
  }

  async function removeEvidence(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    await prisma.evidence.delete({ where: { id: String(formData.get("id")) } }).catch(() => null);
    redirect("/dashboard/marca");
  }

  /** Admin salva direto e no ar. Equipe manda pra BrandDraft — só vira real quando um admin aprovar. */
  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const current = await getBrand();
    const data = readBrandForm(formData);

    if (s.user.role !== "ADMIN") {
      await prisma.brandDraft.upsert({
        where: { id: "default" },
        update: { ...data, proposedBy: s.user.name ?? s.user.email, proposedAt: new Date() },
        create: { id: "default", ...data, proposedBy: s.user.name ?? s.user.email },
      });
      await prisma.reviewTask.create({ data: { description: `${s.user.name ?? s.user.email} propôs mudanças no Guia da marca — aguarda aprovação.`, systemsAffected: ["Guardião", "007", "Sidney"] } });
      await notifyTeam("Proposta de mudança no Guia da marca", `${s.user.name ?? s.user.email} propôs mudanças no Guia da marca. Entre em /dashboard/marca pra revisar e aprovar (ou descartar).`);
      redirect("/dashboard/marca?ok=proposta");
    }

    for (const f of [...BRAND_FIELDS, ...BRAND_LIST_FIELDS]) {
      const c = current as unknown as Record<string, unknown>;
      const oldV = c[f] ?? (Array.isArray(data[f]) ? [] : null);
      const newV = data[f];
      const changed = Array.isArray(newV) ? JSON.stringify(newV) !== JSON.stringify(oldV) : newV !== oldV;
      if (changed) {
        await logChange({
          entity: "Brand", entityId: "default", field: f,
          oldValue: Array.isArray(oldV) ? oldV.join(", ") : (oldV as string | null),
          newValue: Array.isArray(newV) ? newV.join(", ") : (newV as string | null),
          origin: "MANUAL", changedBy: s.user.name ?? s.user.email,
        });
      }
    }
    await prisma.brand.update({ where: { id: "default" }, data: { ...data, updatedBy: s.user.name ?? s.user.email } });
    await prisma.brandDraft.delete({ where: { id: "default" } }).catch(() => null);
    await dispatchEvent("guide.updated", { at: new Date().toISOString() });
    redirect("/dashboard/marca?ok=1");
  }

  /** Admin aprova a proposta da equipe: aplica no Brand de verdade, loga e avisa 007/Sidney. */
  async function approveDraft() {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/dashboard/marca");
    const current = await getBrand();
    const pending = await prisma.brandDraft.findUnique({ where: { id: "default" } });
    if (!pending) redirect("/dashboard/marca");
    const data: Record<string, unknown> = {};
    for (const f of [...BRAND_FIELDS, ...BRAND_LIST_FIELDS]) {
      const c = current as unknown as Record<string, unknown>;
      const p = pending as unknown as Record<string, unknown>;
      const oldV = c[f] ?? (Array.isArray(p[f]) ? [] : null);
      const newV = p[f];
      data[f] = newV;
      const changed = Array.isArray(newV) ? JSON.stringify(newV) !== JSON.stringify(oldV) : newV !== oldV;
      if (changed) {
        await logChange({
          entity: "Brand", entityId: "default", field: f,
          oldValue: Array.isArray(oldV) ? oldV.join(", ") : (oldV as string | null),
          newValue: Array.isArray(newV) ? (newV as string[]).join(", ") : (newV as string | null),
          origin: "MANUAL", changedBy: `${s.user.name ?? s.user.email} (aprovando proposta de ${pending.proposedBy ?? "equipe"})`,
        });
      }
    }
    await prisma.brand.update({ where: { id: "default" }, data: { ...data, updatedBy: `${pending.proposedBy ?? "equipe"} (aprovado por ${s.user.name ?? s.user.email})` } });
    await prisma.brandDraft.delete({ where: { id: "default" } });
    await dispatchEvent("guide.updated", { at: new Date().toISOString() });
    redirect("/dashboard/marca?ok=1");
  }

  /** Admin descarta a proposta sem aplicar nada. */
  async function discardDraft() {
    "use server";
    const s = await auth();
    if (!s || s.user.role !== "ADMIN") redirect("/dashboard/marca");
    await prisma.brandDraft.delete({ where: { id: "default" } }).catch(() => null);
    redirect("/dashboard/marca?ok=descartado");
  }

  const fv = (draft ?? brand) as typeof brand;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Guardião Élyx</p>
        <h1 className="h1 mt-1">Guia da marca</h1>
        <p className="lede mt-1">Propósito, persona, tom de voz e regulatório — a verdade da marca. 007, Sidney e qualquer agente leem isto via GET /v1/brand/context.</p>
      </div>
      {ok === "1" && <p className="rounded-md bg-ok/15 px-3 py-2 text-sm text-ok">Guia salvo. Sistemas assinantes foram avisados.</p>}
      {ok === "proposta" && <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">Proposta enviada — um administrador precisa aprovar antes de valer.</p>}
      {ok === "descartado" && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">Proposta descartada.</p>}

      {draft && (
        <div className="card space-y-2 border-warn/40 bg-warn/5 p-4">
          <h2 className="text-sm font-semibold">Proposta pendente de {draft.proposedBy ?? "equipe"}</h2>
          <p className="text-xs text-muted">Enviada em {draft.proposedAt.toLocaleString("pt-BR")}. Campos alterados: {draftChanges.length ? draftChanges.map((f) => FIELD_LABELS[f] ?? f).join(", ") : "nenhum (igual ao guia atual)"}.</p>
          <p className="text-xs text-muted">O formulário abaixo já está mostrando os valores da proposta — revise, ajuste se quiser, e use um dos botões.</p>
          {isAdmin && (
            <div className="flex gap-2 pt-1">
              <form action={approveDraft}><button type="submit" className="btn btn-primary btn-sm">Aprovar proposta</button></form>
              <form action={discardDraft}><button type="submit" className="btn btn-ghost btn-sm text-danger">Descartar</button></form>
            </div>
          )}
        </div>
      )}

      <form action={save} className="card space-y-4 p-4">
        {!isAdmin && <p className="text-xs text-muted">Sua alteração vai pra aprovação de um administrador antes de valer pro 007 e pro Sidney.</p>}
        <Field label="Propósito e posicionamento"><textarea name="purpose" defaultValue={fv.purpose ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Persona — pra quem a marca fala"><textarea name="persona" defaultValue={fv.persona ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Tom de voz (com exemplos certo/errado)"><textarea name="voiceRules" defaultValue={fv.voiceRules ?? ""} className="input min-h-[100px]" /></Field>
        <Field label="Uso do nome e imagem da Mônica Wagner"><textarea name="monicaRules" defaultValue={fv.monicaRules ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Regras de CTA e cupom"><textarea name="ctaRules" defaultValue={fv.ctaRules ?? ""} className="input min-h-[70px]" /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vocabulário permitido (um por linha)"><textarea name="allowedVocab" defaultValue={fv.allowedVocab.join("\n")} className="input min-h-[100px]" /></Field>
          <Field label="Termos proibidos globais (um por linha)" hint="além da lista fixa ANVISA/CONAR embutida no código">
            <textarea name="bannedTerms" defaultValue={fv.bannedTerms.join("\n")} className="input min-h-[100px]" />
          </Field>
        </div>
        <Field label="Disclaimers obrigatórios"><textarea name="disclaimers" defaultValue={fv.disclaimers ?? ""} className="input min-h-[70px]" /></Field>

        <div className="border-t border-line pt-4">
          <h2 className="text-sm font-semibold">Identidade visual</h2>
          <p className="text-xs text-muted">Única fonte de cor, fonte e regra de imagem pra quem gera peça (Sidney lê em GET /v1/brand/assets). Cor em hex (#5C1F2E). O arquivo da fonte (.ttf/.otf) sobe na seção de material abaixo, como “Fonte”.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ColorField name="colorPrimary" label="Primária (bordô)" value={fv.colorPrimary} />
          <ColorField name="colorSecondary" label="Secundária (verde)" value={fv.colorSecondary} />
          <ColorField name="colorBackground" label="Fundo (creme)" value={fv.colorBackground} />
          <ColorField name="colorAccent" label="Destaque (dourado)" value={fv.colorAccent} />
          <ColorField name="colorText" label="Texto" value={fv.colorText} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fonte de título" hint={fontFileNames.length ? `arquivos carregados: ${fontFileNames.join(", ")}` : "nenhum arquivo de fonte carregado ainda — o Sidney avisa e usa fonte provisória"}>
            <input name="fontDisplay" defaultValue={fv.fontDisplay ?? ""} placeholder="ex.: TAN Aegean" className="input" />
          </Field>
          <Field label="Fonte de texto" hint="Montserrat é fonte gratuita (OFL) — o Sidney já tem os arquivos embutidos, não precisa subir aqui"><input name="fontBody" defaultValue={fv.fontBody ?? ""} placeholder="ex.: Montserrat" className="input" /></Field>
        </div>
        <Field label="Regras de imagem — como é (e como não é) uma imagem Élyx" hint="luz, cenário, pessoa, produto, o que nunca aparece. Vai direto pro prompt da IA e pro revisor automático de imagem.">
          <textarea name="imageRules" defaultValue={fv.imageRules ?? ""} className="input min-h-[120px]" />
        </Field>
        <button type="submit" className="btn btn-primary btn-sm">{isAdmin ? "Salvar guia" : "Propor alteração"}</button>
      </form>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Identidade visual e material de base</h2>
          <p className="text-xs text-muted">Logo, manual de marca, fontes, prints de posts/anúncios que você gostou pra usar de referência. Fica salvo aqui, não some do computador de ninguém.</p>
        </div>
        <AssetManager
          assets={assets.map((a) => ({ id: a.id, type: a.type, blobUrl: a.blobUrl, label: a.label, createdAt: a.createdAt.toISOString(), canDelete: isAdmin || a.type !== "reference" }))}
          onAdd={addBrandAsset}
          onDelete={deleteBrandAsset}
        />
      </section>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Referências e evidências</h2>
          <p className="text-xs text-muted">Links — estudo, matéria, post de concorrente ou inspiração — com uma nota de por que serve de referência.</p>
        </div>
        <form action={addEvidence} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input name="title" placeholder="título" required className="input" />
          <input name="url" placeholder="link (opcional)" className="input" />
          <input name="note" placeholder="por que é referência" className="input" />
          <button type="submit" className="btn btn-secondary btn-sm">adicionar</button>
        </form>
        <div className="space-y-1">
          {evidences.length === 0 && <p className="text-xs text-muted">Nenhuma referência salva ainda.</p>}
          {evidences.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
              <span className="font-medium">{e.title}</span>
              {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">abrir <IconExternal size={11} /></a>}
              {e.note && <span className="text-xs text-muted">— {e.note}</span>}
              <form action={removeEvidence} className="ml-auto"><input type="hidden" name="id" value={e.id} /><button type="submit" className="btn btn-ghost btn-xs px-1 text-danger"><IconTrash size={12} /></button></form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ColorField({ name, label, value }: { name: string; label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <span className="inline-block h-8 w-8 shrink-0 rounded-md border border-line" style={{ backgroundColor: value ?? "transparent" }} />
        <input name={name} defaultValue={value ?? ""} placeholder="#5C1F2E" pattern="^#[0-9a-fA-F]{6}$" className="input font-mono" />
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
