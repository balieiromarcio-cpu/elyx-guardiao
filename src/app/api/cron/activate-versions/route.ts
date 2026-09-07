import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuth } from "@/lib/api-auth";
import { activateDueVersions } from "@/lib/versioning";
import { notifyTeam } from "@/lib/email";

export const maxDuration = 60;

/** Diário 6h — ativa toda versão aprovada cuja data de vigência chegou (regra: "vira vigente sozinha"). */
export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const activated = await activateDueVersions();
    return NextResponse.json({ ok: true, activated: activated.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await notifyTeam("Rotina de ativação de versões falhou", `A rotina diária que ativa versões aprovadas (activate-versions) falhou hoje:\n\n${msg}\n\nNenhuma ficha vira vigente sozinha até isso ser corrigido — confira o log da Vercel.`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
