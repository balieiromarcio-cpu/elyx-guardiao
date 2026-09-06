"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { IconUpload, IconCheck, IconPlus, IconTrash } from "@/components/icons";

type Row = { name: string; quantity: string; unit: string; dailyValuePercent: string };
const emptyRow = (): Row => ({ name: "", quantity: "", unit: "", dailyValuePercent: "" });

/**
 * Propõe uma versão nova da ficha a partir do rótulo fotografado. Fase 1: preenchimento
 * manual dos campos (extração automática por IA é a fase 1c do plano). Documento é
 * obrigatório — regra do desenho: fato de rótulo sem foto/laudo anexado não é aceito.
 */
export function VersionEditor({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [f, setF] = useState({ dosage: "", packaging: "", warnings: "", anvisaRegistry: "", facts: "", effectiveFrom: new Date().toISOString().slice(0, 10) });

  async function uploadDoc() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/admin/blob-upload" });
      setDocumentUrl(blob.url);
      setMsg({ ok: true, text: "Documento anexado." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "falha no upload" });
    }
    setBusy(false);
  }

  async function save() {
    if (!documentUrl) {
      setMsg({ ok: false, text: "Anexe a foto do rótulo (ou laudo) antes de propor a versão." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/products/${slug}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, documentUrl, ingredients: rows.filter((r) => r.name.trim()) }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: "Versão proposta. Aguarda aprovação de um administrador." });
      setRows([emptyRow()]);
      setDocumentUrl(null);
      setFile(null);
      router.refresh();
    } else {
      setMsg({ ok: false, text: json.error ?? `erro ${res.status}` });
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary btn-sm">
        <IconPlus size={14} /> Propor nova versão
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nova versão — a partir do rótulo</p>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-xs">fechar</button>
      </div>

      <div>
        <p className="label mb-1">Foto do rótulo ou laudo (obrigatório pra aprovar)</p>
        <div className="flex items-center gap-2">
          <label className="btn btn-secondary btn-xs cursor-pointer">
            {file ? file.name.slice(0, 20) : "Escolher arquivo"}
            <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          </label>
          <button type="button" onClick={uploadDoc} disabled={!file || busy} className="btn btn-secondary btn-xs">
            <IconUpload size={12} /> anexar
          </button>
          {documentUrl && <span className="inline-flex items-center gap-1 text-xs text-ok"><IconCheck size={12} /> anexado</span>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Posologia oficial" hint='ex: "2 cápsulas ao dia"'>
          <input className="input" value={f.dosage} onChange={(e) => setF({ ...f, dosage: e.target.value })} />
        </Field>
        <Field label="Embalagem">
          <input className="input" value={f.packaging} onChange={(e) => setF({ ...f, packaging: e.target.value })} />
        </Field>
        <Field label="Avisos obrigatórios do rótulo">
          <input className="input" value={f.warnings} onChange={(e) => setF({ ...f, warnings: e.target.value })} />
        </Field>
        <Field label="Registro/dispensa ANVISA">
          <input className="input" value={f.anvisaRegistry} onChange={(e) => setF({ ...f, anvisaRegistry: e.target.value })} />
        </Field>
        <Field label="Data de vigência" hint="se for futura, fica esperando até a data pra virar vigente sozinha">
          <input type="date" className="input" value={f.effectiveFrom} onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })} />
        </Field>
      </div>
      <Field label="Fatos confirmados (texto livre)">
        <textarea className="input min-h-[70px]" value={f.facts} onChange={(e) => setF({ ...f, facts: e.target.value })} />
      </Field>

      <div>
        <p className="label mb-1">Tabela nutricional</p>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_70px_90px_28px] gap-2">
              <input className="input" placeholder="ingrediente/ativo" value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" placeholder="quantidade" value={r.quantity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
              <input className="input" placeholder="unidade" value={r.unit} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
              <input className="input" placeholder="%VD" value={r.dailyValuePercent} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, dailyValuePercent: e.target.value } : x)))} />
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="btn btn-ghost btn-xs px-1"><IconTrash size={13} /></button>
            </div>
          ))}
          <button type="button" onClick={() => setRows([...rows, emptyRow()])} className="btn btn-ghost btn-xs"><IconPlus size={12} /> linha</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-sm">{busy ? "Salvando…" : "Propor versão"}</button>
        {msg && <span className={`text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</span>}
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
