import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getWiPayConfig } from "@/lib/wipay/config";
import { fulfillWiPayAttempt } from "@/lib/payments/fulfill-wipay-attempt";

export const runtime = "nodejs";

type WiPayWebhook = {
  id: string;
  event: string;
  data?: { transaction_id?: string; order_id?: string };
};

function validSignature(body: string, signature: string, secret: string): boolean {
  const match = /^sha256=([a-f\d]{64})$/i.exec(signature);
  if (!match) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(match[1], "hex");
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  const { webhookSecret } = getWiPayConfig();
  if (!webhookSecret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-wipay-webhook-signature") ?? "";
  const timestamp = Number(request.headers.get("x-wipay-webhook-timestamp"));
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() / 1000 - timestamp) > 300 ||
    !validSignature(rawBody, signature, webhookSecret)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: WiPayWebhook;
  try {
    event = JSON.parse(rawBody) as WiPayWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!event.id || !event.event) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const transactionId = event.data?.transaction_id;
  try {
    if (event.event === "payment.success" && transactionId) {
      const attempt = await prisma.paymentAttempt.findFirst({
        where: { providerTransactionId: transactionId },
      });
      if (attempt && attempt.status !== "SUCCEEDED") {
        await fulfillWiPayAttempt(attempt);
        await prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: { status: "SUCCEEDED", paidAt: new Date() },
        });
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: { id: event.id, eventType: event.event, payload: event as object },
      });
      if (!transactionId) return;
      const status =
        event.event === "payment.refund_requested" ? "REFUND_REQUESTED"
        : event.event === "payment.refunded" ? "REFUNDED"
        : event.event === "payment.chargeback_pending" ? "CHARGEBACK_PENDING"
        : event.event === "payment.chargeback_processed" ? "CHARGEBACK_PROCESSED"
        : event.event === "payment.chargeback_released" ? "CHARGEBACK_RELEASED"
        : event.event === "payment.fraud_confirmed" ? "FRAUD_CONFIRMED"
        : event.event === "payment.failed" ? "FAILED"
        : event.event === "payment.error" ? "ERROR"
        : null;
      if (status) {
        await tx.paymentAttempt.updateMany({
          where: { providerTransactionId: transactionId },
          data: { status },
        });
      }
    });
  } catch (error) {
    const duplicate = error instanceof Error && /Unique constraint/i.test(error.message);
    if (!duplicate) throw error;
  }
  return NextResponse.json({ received: true });
}
