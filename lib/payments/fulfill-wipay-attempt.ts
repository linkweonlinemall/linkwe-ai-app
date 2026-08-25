import type { PaymentAttempt } from "@prisma/client";

import { handleBookingPaymentSucceeded } from "@/lib/finance/booking-payment";
import { fulfillPaidTicketOrder } from "@/lib/payments/fulfill-ticket-order";
import { fulfillProductOrder } from "@/lib/payments/fulfill-product-order";
import { prisma } from "@/lib/prisma";

function addInterval(from: Date, interval: string): Date {
  const next = new Date(from);
  if (interval === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (interval === "fortnightly") next.setUTCDate(next.getUTCDate() + 14);
  else if (interval === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

/** Idempotently applies the business result of a successful WiPay transaction. */
export async function fulfillWiPayAttempt(attempt: PaymentAttempt): Promise<void> {
  if (attempt.purpose === "PRODUCT_ORDER") {
    await fulfillProductOrder(attempt.targetId, attempt.userId);
    return;
  }

  if (attempt.purpose === "AI_TOPUP") {
    await prisma.$transaction(async (tx) => {
      const topup = await tx.aITopupPurchase.findUnique({
        where: { id: attempt.targetId },
        select: { storeId: true, usesPurchased: true, status: true },
      });
      if (!topup || topup.status !== "PENDING") return;
      await tx.aITopupPurchase.update({
        where: { id: attempt.targetId },
        data: { status: "PAID", paidAt: new Date() },
      });
      await tx.store.update({
        where: { id: topup.storeId },
        data: { aiTopupCreditsRemaining: { increment: topup.usesPurchased } },
      });
    });
    return;
  }

  if (attempt.purpose === "ON_DEMAND_SERVICE") {
    await prisma.onDemandRequest.updateMany({
      where: { id: attempt.targetId, status: { not: "CONFIRMED" } },
      data: { status: "CONFIRMED", amountPaid: attempt.amountMinor / 100 },
    });
    return;
  }

  if (attempt.purpose === "PRODUCT_BOOKING") {
    const providerData = attempt.providerData as { paymentType?: string } | null;
    await handleBookingPaymentSucceeded({
      bookingId: attempt.targetId,
      paymentType: providerData?.paymentType === "deposit" ? "deposit" : "full_payment",
      amountPaid: attempt.amountMinor / 100,
      providerTransactionId: attempt.providerTransactionId ?? undefined,
    });
    return;
  }

  if (attempt.purpose === "TICKET_ORDER") {
    await fulfillPaidTicketOrder(attempt.targetId);
    return;
  }

  if (attempt.purpose === "VENDOR_SUBSCRIPTION") {
    const data = attempt.providerData as { targetPlan?: string } | null;
    const targetPlan = data?.targetPlan === "PRO" ? "PRO" : "GROWTH";
    const store = await prisma.store.findUnique({
      where: { id: attempt.targetId },
      select: { planRenewsAt: true },
    });
    const renewalBase = store?.planRenewsAt && store.planRenewsAt > new Date()
      ? store.planRenewsAt
      : new Date();
    await prisma.store.update({
      where: { id: attempt.targetId },
      data: {
        subscriptionPlan: targetPlan,
        subscriptionStatus: "ACTIVE",
        planRenewsAt: addInterval(renewalBase, "monthly"),
        pastDueSince: null,
        autoRenew: false,
        wipayTrustedCardId: attempt.trustedCardId,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      },
    });
    return;
  }

  if (attempt.purpose === "SERVICE_SUBSCRIPTION") {
    const data = attempt.providerData as {
      storeId?: string;
      interval?: string;
      subscriptionId?: string;
    } | null;
    if (!data?.storeId || !data.interval || !attempt.trustedCardId) {
      throw new Error("Service subscription payment metadata is incomplete");
    }
    const existing = data.subscriptionId
      ? await prisma.customerServiceSubscription.findFirst({
          where: { id: data.subscriptionId, customerId: attempt.userId },
        })
      : await prisma.customerServiceSubscription.findFirst({
          where: { customerId: attempt.userId, productId: attempt.targetId },
          orderBy: { createdAt: "desc" },
        });
    const renewalBase = existing?.currentPeriodEnd && existing.currentPeriodEnd > new Date()
      ? existing.currentPeriodEnd
      : new Date();
    const periodEnd = addInterval(renewalBase, data.interval);
    if (existing) {
      await prisma.customerServiceSubscription.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
          nextChargeAt: periodEnd,
          lastChargeAt: new Date(),
          priceMinor: attempt.amountMinor,
          interval: data.interval,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          wipayTrustedCardId: attempt.trustedCardId,
          stripeSubscriptionId: null,
        },
      });
    } else {
      await prisma.customerServiceSubscription.create({
        data: {
          customerId: attempt.userId,
          productId: attempt.targetId,
          storeId: data.storeId,
          priceMinor: attempt.amountMinor,
          interval: data.interval,
          currentPeriodEnd: periodEnd,
          nextChargeAt: periodEnd,
          lastChargeAt: new Date(),
          wipayTrustedCardId: attempt.trustedCardId,
        },
      });
    }
  }
}
