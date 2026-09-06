import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { productContextBlock } from "@/lib/compliance";

/** Porta 2 — bloco de texto pronto pra prompt de qualquer agente (fatos + pode/não pode dizer). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const block = await productContextBlock(slug);
  if (block === null) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return new NextResponse(block, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
