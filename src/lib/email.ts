/**
 * E-mail transacional via Resend (HTTP, sem SDK) — mesmo padrão do elyx-associadas.
 * Configuração no Vercel: RESEND_API_KEY, EMAIL_FROM, NOTIFY_EMAILS (separados por vírgula).
 * Sem as variáveis, nada quebra: o envio fica registrado como "não configurado" no log do
 * servidor e a mudança continua visível na tela de Changelog/Tarefas.
 */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string; skipped?: boolean };

export async function sendEmail(input: { to: string[]; subject: string; html: string; text: string }): Promise<EmailResult> {
  if (!isEmailConfigured() || input.to.length === 0) return { ok: false, skipped: true, error: "e-mail não configurado ou sem destinatário" };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${body.message ?? body.name ?? "erro"}` };
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Aviso de mudança pra equipe (regra do desenho, seção 3: fato de rótulo/claim mudou). Nunca lança. */
export async function notifyTeam(subject: string, body: string): Promise<EmailResult> {
  const to = (process.env.NOTIFY_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a8842f;font-weight:600;margin:0 0 8px">Guardião Élyx</p>
    <h1 style="font-size:19px;margin:0 0 14px;color:#1b1813">${escapeHtml(subject)}</h1>
    <p style="font-size:14px;line-height:1.6;color:#1b1813;white-space:pre-wrap">${escapeHtml(body)}</p>
  </div>`;
  return sendEmail({ to, subject: `[Guardião] ${subject}`, html, text: body }).catch((e) => ({ ok: false, error: String(e) }));
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
