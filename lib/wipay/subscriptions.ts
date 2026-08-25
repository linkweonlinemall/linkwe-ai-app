import type { PaymentPurpose, Prisma } from "@prisma/client";

import { BASE_URL } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";
import { chargeTrustedCard, createTrustedCardEnrollment } from "@/lib/wipay/wapi";

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
