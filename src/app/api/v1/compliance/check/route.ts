import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { checkCompliance } from "@/lib/compliance";

/** Porta 3 — qualquer sistema manda um texto (e opcionalmente o slug do produto) e recebe os alertas. */
export async function POST(req: NextRequest) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const product = typeof body.product === "string" ? body.product : undefined;
  const flags = await checkCompliance(text, product);
  return NextResponse.json({ flags, ok: flags.length === 0 });
}
