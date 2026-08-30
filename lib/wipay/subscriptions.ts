import type { PaymentPurpose, Prisma } from "@prisma/client";

import { BASE_URL } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";
import { chargeTrustedCard, createTrustedCardEnrollment } from "@/lib/wipay/wapi";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";

type SubscriptionPurpose = Extract<
  PaymentPurpose,
  "VENDOR_SUBSCRIPTION" | "SERVICE_SUBSCRIPTION"
>;

type SubscriptionContext = {
  userId: string;
  purpose: SubscriptionPurpose;
  targetId: string;
  amountMinor: number;
  metadata: Prisma.InputJsonValue;
  forceEnroll?: boolean;
};

export async function beginWiPaySubscription(input: SubscriptionContext): Promise<string> {
  const trustedCard = await prisma.wiPayTrustedCard.findFirst({
    where: { userId: input.userId, status: "VERIFIED" },
    orderBy: { verifiedAt: "desc" },
  });
  if (trustedCard && !input.forceEnroll) {
    return startSubscriptionCharge(input, trustedCard.id, trustedCard.providerUuid);
  }

  const enrollment = await prisma.wiPayCardEnrollment.create({
    data: {
      userId: input.userId,
      purpose: input.purpose,
      targetId: input.targetId,
      amountMinor: input.amountMinor,
      metadata: input.metadata,
    },
  });
  const result = await createTrustedCardEnrollment(
    `${BASE_URL}/api/payments/wipay/card-return?enrollment=${encodeURIComponent(enrollment.id)}`,
  );
  await prisma.wiPayCardEnrollment.update({
    where: { id: enrollment.id },
    data: { providerTransactionId: result.transaction_id },
  });
  return result.url;
}

/**
 * Service subscriptions renew with customer approval, so they use WiPay's normal
 * TTD checkout. This avoids the trusted-card USD micro-charge that many local
 * debit cards reject while preserving a complete paid-period subscription.
 */
export async function beginWiPayManualSubscription(input: SubscriptionContext): Promise<string> {
  const attempt = await prisma.paymentAttempt.create({
    data: {
      purpose: input.purpose,
      merchantOrderId: `${input.purpose === "VENDOR_SUBSCRIPTION" ? "vsub" : "ssub"}-${crypto.randomUUID()}`,
      amountMinor: input.amountMinor,
      userId: input.userId,
      targetId: input.targetId,
      providerData: input.metadata,
    },
  });
  try {
    const result = await createWiPayHostedPayment({
      merchantOrderId: attempt.merchantOrderId,
      amountMinor: input.amountMinor,
      responseUrl: `${BASE_URL}/api/payments/wipay/return`,
      data: { purpose: input.purpose, targetId: input.targetId },
    });
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { providerTransactionId: result.transactionId } });
    return result.url;
  } catch (error) {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "ERROR", failureMessage: error instanceof Error ? error.message : "WiPay payment setup failed" } });
    throw error;
  }
}

export async function startSubscriptionCharge(
  input: SubscriptionContext,
  trustedCardId: string,
  providerUuid: string,
): Promise<string> {
  const attempt = await prisma.paymentAttempt.create({
    data: {
      purpose: input.purpose,
      merchantOrderId: `${input.purpose === "VENDOR_SUBSCRIPTION" ? "vsub" : "ssub"}-${crypto.randomUUID()}`,
      amountMinor: input.amountMinor,
      userId: input.userId,
      targetId: input.targetId,
      trustedCardId,
      providerData: input.metadata,
    },
  });
  const result = await chargeTrustedCard({
    providerUuid,
    merchantOrderId: attempt.merchantOrderId,
    amountMinor: input.amountMinor,
    responseUrl: `${BASE_URL}/api/payments/wipay/return`,
    data: JSON.stringify({ purpose: input.purpose, targetId: input.targetId }),
  });
  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: { providerTransactionId: result.transaction_id },
  });
  return result.url;
}
