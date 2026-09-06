"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { IconUpload, IconTrash, IconExternal } from "@/components/icons";

export type AssetItem = { id: string; type: string; blobUrl: string; label: string | null; createdAt: string };

const TYPES = [
  { value: "logo", label: "Logo" },
  { value: "guideline", label: "Manual de marca / guideline" },
  { value: "photo", label: "Foto de referência" },
  { value: "font", label: "Fonte" },
  { value: "reference", label: "Post/anúncio que gostei (print)" },
  { value: "video", label: "Vídeo" },
];

/**
 * Material de base da marca: logo, guideline, fontes, prints de posts/anúncios de
 * referência. Upload direto pro Blob (mesmo padrão de version-editor.tsx) — o arquivo nunca
 * passa pelo corpo da função serverless.
 */
export function AssetManager({
  assets,
  onAdd,
  onDelete,
}: {
  assets: AssetItem[];
  onAdd: (input: { type: string; blobUrl: string; label: string | null }) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState("reference");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/admin/blob-upload" });
      await onAdd({ type, blobUrl: blob.url, label: label.trim() || null });
      setFile(null);
      setLabel("");
      setMsg({ ok: true, text: "Enviado." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "falha no upload" });
    }
    setBusy(false);
  }

  async function remove(id: string) {
    await onDelete(id);
    router.refresh();
  }

  const isImage = (url: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(url);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className="select w-56">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="legenda (opcional)" className="input flex-1 min-w-[180px]" />
        <label className="btn btn-secondary btn-sm cursor-pointer">
          {file ? file.name.slice(0, 24) : "Escolher arquivo"}
          <input
            type="file"
            accept="image/*,video/*,application/pdf,font/*,.otf,.ttf,.woff,.woff2"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        <button type="button" onClick={send} disabled={!file || busy} className="btn btn-primary btn-sm">
          <IconUpload size={13} /> {busy ? "Enviando…" : "Enviar"}
        </button>
        {msg && <span className={`text-xs ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</span>}
      </div>

      {assets.length === 0 ? (
        <p className="text-xs text-muted">Nenhum material enviado ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((a) => (
            <div key={a.id} className="card overflow-hidden">
              <div className="flex aspect-square items-center justify-center bg-surface-2">
                {isImage(a.blobUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.blobUrl} alt={a.label ?? a.type} className="h-full w-full object-contain" />
                ) : (
                  <a href={a.blobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    abrir arquivo <IconExternal size={11} />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 p-2 text-xs">
                <span className="badge badge-muted">{TYPES.find((t) => t.value === a.type)?.label ?? a.type}</span>
                <span className="flex-1 truncate">{a.label ?? "—"}</span>
                <button type="button" onClick={() => remove(a.id)} className="btn btn-ghost btn-xs px-1 text-danger"><IconTrash size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
