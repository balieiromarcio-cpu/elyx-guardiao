import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { notifyTeam } from "@/lib/email";

export type GuardiaoEvent = "product.updated" | "guide.updated" | "review.requested";

const DELIVERY_ATTEMPTS = 3;
const DELIVERY_RETRY_DELAY_MS = 1500;

/**
 * Avisa cada sistema assinante (007, Sidney, portal…) que algo mudou, pra ele limpar o
 * cache local (5 min de TTL na leitura pela API). Assinatura HMAC do corpo com o secret do
 * assinante, no header X-Guardiao-Signature — mesmo espírito da verificação do lado da
 * Shopify. Best-effort, mas com 3 tentativas: um soluço de alguns segundos no consumidor não
 * pode virar "cache desatualizado até o TTL de 5 min expirar por sorte". Se mesmo assim falhar,
 * avisa a equipe por e-mail — sem isso a entrega falhava só no log, sem ninguém saber.
 */
export async function dispatchEvent(event: GuardiaoEvent, payload: Record<string, unknown>) {
  const subs = await prisma.webhookSubscriber.findMany({ where: { active: true, events: { has: event } } });
  const body = JSON.stringify({ event, at: new Date().toISOString(), ...payload });
  await Promise.all(
    subs.map(async (sub) => {
      const signature = crypto.createHmac("sha256", sub.secret).update(body).digest("hex");
      let lastStatus = "";
      for (let attempt = 1; attempt <= DELIVERY_ATTEMPTS; attempt++) {
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
          lastStatus = String(res.status);
          if (res.ok) {
            await prisma.webhookSubscriber.update({ where: { id: sub.id }, data: { lastDeliveryAt: new Date(), lastStatus } });
            return;
          }
        } catch (e) {
          lastStatus = `erro: ${e instanceof Error ? e.message : String(e)}`;
        }
        if (attempt < DELIVERY_ATTEMPTS) await new Promise((r) => setTimeout(r, DELIVERY_RETRY_DELAY_MS * attempt));
      }
      await prisma.webhookSubscriber
        .update({ where: { id: sub.id }, data: { lastDeliveryAt: new Date(), lastStatus } })
        .catch(() => null);
      await notifyTeam(
        `Webhook não entregue: ${sub.consumer}`,
        `O evento "${event}" não chegou em ${sub.consumer} (${sub.url}) depois de ${DELIVERY_ATTEMPTS} tentativas.\n\nÚltimo status: ${lastStatus}\n\nEsse sistema pode estar servindo dado desatualizado até o cache local dele expirar (até 5 min) ou até isso ser corrigido.`
      );
    })
  );
}
