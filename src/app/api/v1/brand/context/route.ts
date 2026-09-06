import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { brandContextBlock } from "@/lib/compliance";

export async function GET(req: NextRequest) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const block = await brandContextBlock();
  return new NextResponse(block, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
