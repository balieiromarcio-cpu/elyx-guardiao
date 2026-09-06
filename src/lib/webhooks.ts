import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type GuardiaoEvent = "product.updated" | "guide.updated" | "review.requested";

/**
 * Avisa cada sistema assinante (007, Sidney, portal…) que algo mudou, pra ele limpar o
 * cache local (5 min de TTL na leitura pela API). Assinatura HMAC do corpo com o secret do
 * assinante, no header X-Guardiao-Signature — mesmo espírito da verificação do lado da
 * Shopify. Best-effort: falha de entrega não bloqueia a operação que gerou o evento.
 */
export async function dispatchEvent(event: GuardiaoEvent, payload: Record<string, unknown>) {
  const subs = await prisma.webhookSubscriber.findMany({ where: { active: true, events: { has: event } } });
  const body = JSON.stringify({ event, at: new Date().toISOString(), ...payload });
  await Promise.all(
    subs.map(async (sub) => {
      const signature = crypto.createHmac("sha256", sub.secret).update(body).digest("hex");
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch(sub.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Guardiao-Signature": signature, "X-Guardiao-Event": event },
          body,
          signal: controller.signal,
        });
        clearTimeout(t);
        await prisma.webhookSubscriber.update({ where: { id: sub.id }, data: { lastDeliveryAt: new Date(), lastStatus: String(res.status) } });
      } catch (e) {
        await prisma.webhookSubscriber
          .update({ where: { id: sub.id }, data: { lastDeliveryAt: new Date(), lastStatus: `erro: ${e instanceof Error ? e.message : String(e)}` } })
          .catch(() => null);
      }
    })
  );
}
