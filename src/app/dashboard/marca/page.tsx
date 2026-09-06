import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBrand } from "@/lib/compliance";
import { logChange } from "@/lib/versioning";
import { dispatchEvent } from "@/lib/webhooks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MarcaPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const brand = await getBrand();
  const { ok } = await searchParams;

  async function save(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s) redirect("/login");
    const fields = ["purpose", "persona", "voiceRules", "monicaRules", "ctaRules", "disclaimers"] as const;
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
        <button type="submit" className="btn btn-primary btn-sm">Salvar guia</button>
      </form>
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
