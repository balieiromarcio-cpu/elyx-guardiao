import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBrand } from "@/lib/compliance";
import { logChange } from "@/lib/versioning";
import { dispatchEvent } from "@/lib/webhooks";
import { prisma } from "@/lib/prisma";
import { AssetManager } from "@/components/asset-manager";
import { addBrandAsset, deleteBrandAsset } from "./actions";
import { IconExternal, IconTrash } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MarcaPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const [brand, assets, evidences] = await Promise.all([
    getBrand(),
    prisma.asset.findMany({ where: { productId: null }, orderBy: { createdAt: "desc" } }),
    prisma.evidence.findMany({ where: { productId: null }, orderBy: { createdAt: "desc" } }),
  ]);
  const { ok } = await searchParams;
  const fontFileNames = assets.filter((a) => /\.(ttf|otf|woff)(\?|$)/i.test(a.blobUrl)).map((a) => decodeURIComponent(a.blobUrl.split("/").pop() ?? ""));

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

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const fields = ["purpose", "persona", "voiceRules", "monicaRules", "ctaRules", "disclaimers", "colorPrimary", "colorSecondary", "colorBackground", "colorAccent", "colorText", "fontDisplay", "fontBody", "imageRules"] as const;
    const listFields = ["allowedVocab", "bannedTerms"] as const;
    const current = await getBrand();
    const data: Record<string, unknown> = {};
    for (const f of fields) {
      const v = String(formData.get(f) ?? "").trim() || null;
      if (v !== (current[f] ?? null)) {
        await logChange({ entity: "Brand", entityId: "default", field: f, oldValue: current[f] ?? null, newValue: v, origin: "MANUAL", changedBy: s.user.name ?? s.user.email });
      }
      data[f] = v;
    }
    for (const f of listFields) {
      const raw = String(formData.get(f) ?? "");
      const list = raw.split("\n").map((x) => x.trim()).filter(Boolean);
      const oldList = current[f] ?? [];
      if (JSON.stringify(list) !== JSON.stringify(oldList)) {
        await logChange({ entity: "Brand", entityId: "default", field: f, oldValue: oldList.join(", "), newValue: list.join(", "), origin: "MANUAL", changedBy: s.user.name ?? s.user.email });
      }
      data[f] = list;
    }
    await prisma.brand.update({ where: { id: "default" }, data: { ...data, updatedBy: s.user.name ?? s.user.email } });
    await dispatchEvent("guide.updated", { at: new Date().toISOString() });
    redirect("/dashboard/marca?ok=1");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Guardião Élyx</p>
        <h1 className="h1 mt-1">Guia da marca</h1>
        <p className="lede mt-1">Propósito, persona, tom de voz e regulatório — a verdade da marca. 007, Sidney e qualquer agente leem isto via GET /v1/brand/context.</p>
      </div>
      {ok && <p className="rounded-md bg-ok/15 px-3 py-2 text-sm text-ok">Guia salvo. Sistemas assinantes foram avisados.</p>}

      <form action={save} className="card space-y-4 p-4">
        <Field label="Propósito e posicionamento"><textarea name="purpose" defaultValue={brand.purpose ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Persona — pra quem a marca fala"><textarea name="persona" defaultValue={brand.persona ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Tom de voz (com exemplos certo/errado)"><textarea name="voiceRules" defaultValue={brand.voiceRules ?? ""} className="input min-h-[100px]" /></Field>
        <Field label="Uso do nome e imagem da Mônica Wagner"><textarea name="monicaRules" defaultValue={brand.monicaRules ?? ""} className="input min-h-[70px]" /></Field>
        <Field label="Regras de CTA e cupom"><textarea name="ctaRules" defaultValue={brand.ctaRules ?? ""} className="input min-h-[70px]" /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Vocabulário permitido (um por linha)"><textarea name="allowedVocab" defaultValue={brand.allowedVocab.join("\n")} className="input min-h-[100px]" /></Field>
          <Field label="Termos proibidos globais (um por linha)" hint="além da lista fixa ANVISA/CONAR embutida no código">
            <textarea name="bannedTerms" defaultValue={brand.bannedTerms.join("\n")} className="input min-h-[100px]" />
          </Field>
        </div>
        <Field label="Disclaimers obrigatórios"><textarea name="disclaimers" defaultValue={brand.disclaimers ?? ""} className="input min-h-[70px]" /></Field>

        <div className="border-t border-line pt-4">
          <h2 className="text-sm font-semibold">Identidade visual</h2>
          <p className="text-xs text-muted">Única fonte de cor, fonte e regra de imagem pra quem gera peça (Sidney lê em GET /v1/brand/assets). Cor em hex (#5C1F2E). O arquivo da fonte (.ttf/.otf) sobe na seção de material abaixo, como “Fonte”.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ColorField name="colorPrimary" label="Primária (bordô)" value={brand.colorPrimary} />
          <ColorField name="colorSecondary" label="Secundária (verde)" value={brand.colorSecondary} />
          <ColorField name="colorBackground" label="Fundo (creme)" value={brand.colorBackground} />
          <ColorField name="colorAccent" label="Destaque (dourado)" value={brand.colorAccent} />
          <ColorField name="colorText" label="Texto" value={brand.colorText} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fonte de título" hint={fontFileNames.length ? `arquivos carregados: ${fontFileNames.join(", ")}` : "nenhum arquivo de fonte carregado ainda — o Sidney avisa e usa fonte provisória"}>
            <input name="fontDisplay" defaultValue={brand.fontDisplay ?? ""} placeholder="ex.: TAN Aegean" className="input" />
          </Field>
          <Field label="Fonte de texto" hint="Montserrat é fonte gratuita (OFL) — o Sidney já tem os arquivos embutidos, não precisa subir aqui"><input name="fontBody" defaultValue={brand.fontBody ?? ""} placeholder="ex.: Montserrat" className="input" /></Field>
        </div>
        <Field label="Regras de imagem — como é (e como não é) uma imagem Élyx" hint="luz, cenário, pessoa, produto, o que nunca aparece. Vai direto pro prompt da IA e pro revisor automático de imagem.">
          <textarea name="imageRules" defaultValue={brand.imageRules ?? ""} className="input min-h-[120px]" />
        </Field>
        <button type="submit" className="btn btn-primary btn-sm">Salvar guia</button>
      </form>

      <section className="card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Identidade visual e material de base</h2>
          <p className="text-xs text-muted">Logo, manual de marca, fontes, prints de posts/anúncios que você gostou pra usar de referência. Fica salvo aqui, não some do computador de ninguém.</p>
        </div>
        <AssetManager
          assets={assets.map((a) => ({ id: a.id, type: a.type, blobUrl: a.blobUrl, label: a.label, createdAt: a.createdAt.toISOString() }))}
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
