import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuth } from "@/lib/api-auth";
import { activateDueVersions } from "@/lib/versioning";

export const maxDuration = 60;

/** Diário 6h — ativa toda versão aprovada cuja data de vigência chegou (regra: "vira vigente sozinha"). */
export async function GET(req: NextRequest) {
  if (!isValidCronAuth(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const activated = await activateDueVersions();
  return NextResponse.json({ ok: true, activated: activated.length });
}
