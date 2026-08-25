"use server";

import { getSession } from "@/lib/auth/session";
import { getAITopupBundle } from "@/lib/finance/ai-topup-bundles";
import { prisma } from "@/lib/prisma";
import { BASE_URL } from "@/lib/email/resend";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";

export type StartAITopupCheckoutResult =
  | { ok: true; checkoutUrl: string; purchaseId: string }
  | { ok: false; error: string };

export async function startAITopupCheckout(
  bundleKey: string,
): Promise<StartAITopupCheckoutResult> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Not authorized." };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) {
    return { ok: false, error: "No store found." };
  }

  const bundle = getAITopupBundle(bundleKey);
  if (!bundle) {
    return { ok: false, error: "Invalid bundle." };
  }

  try {
    const purchase = await prisma.aITopupPurchase.create({
      data: {
        storeId: store.id,
        usesPurchased: bundle.uses,
        pricePaidMinor: bundle.priceMinor,
        status: "PENDING",
      },
      select: { id: true },
    });

    const merchantOrderId = `topup-${purchase.id}`;
    await prisma.paymentAttempt.create({
      data: {
        purpose: "AI_TOPUP",
        merchantOrderId,
        amountMinor: bundle.priceMinor,
        userId: session.userId,
        targetId: purchase.id,
      },
    });
    const payment = await createWiPayHostedPayment({
      merchantOrderId,
      amountMinor: bundle.priceMinor,
      responseUrl: `${BASE_URL}/api/payments/wipay/return`,
      data: { purpose: "AI_TOPUP", targetId: purchase.id },
    });
    await prisma.paymentAttempt.update({
      where: { merchantOrderId },
      data: { providerTransactionId: payment.transactionId },
    });
    return { ok: true, checkoutUrl: payment.url, purchaseId: purchase.id };
  } catch (e) {
    console.error("[ai-topup] create purchase", e);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}
