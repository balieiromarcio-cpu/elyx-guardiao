import { NextRequest, NextResponse } from "next/server";
import { authenticateConsumer } from "@/lib/api-auth";
import { notifyTeam } from "@/lib/email";

/**
 * Rota temporária de verificação — confirma que o Resend está configurado de verdade,
 * disparando um e-mail real via notifyTeam(). Remover depois de confirmado (ver git log).
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateConsumer(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await notifyTeam(
    "Teste de alerta — mecanismo de e-mail",
    "Este é um teste real do alerta por e-mail do Guardião, disparado durante o ajuste fino do mecanismo. Se você recebeu isto, o Resend está funcionando de verdade em produção."
  );
  return NextResponse.json(result);
}
