import type { PaymentAttempt } from "@prisma/client";

import { handleBookingPaymentSucceeded } from "@/lib/finance/booking-payment";
import { fulfillPaidTicketOrder } from "@/lib/payments/fulfill-ticket-order";
import { fulfillProductOrder } from "@/lib/payments/fulfill-product-order";
import { createVendorEarningsLedgerPair } from "@/lib/finance/release-earnings";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
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
    const confirmed = await prisma.onDemandRequest.updateMany({
      where: { id: attempt.targetId, status: "ACCEPTED" },
      data: { status: "CONFIRMED", amountPaid: attempt.amountMinor / 100 },
    });
    if (confirmed.count === 0) {
      const existing = await prisma.onDemandRequest.findUnique({
        where: { id: attempt.targetId },
        select: { status: true, amountPaid: true },
      });
      const alreadyApplied =
        existing &&
        (existing.status === "CONFIRMED" || existing.status === "COMPLETED") &&
        existing.amountPaid === attempt.amountMinor / 100;
      if (!alreadyApplied) throw new Error("On-demand payment target is closed");
    }
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
    if (attempt.amountMinor !== PLAN_PRICE_MINOR[targetPlan]) {
      throw new Error("Vendor subscription payment amount is invalid");
    }
    await prisma.$transaction(async (tx) => {
      const payment = await tx.paymentAttempt.findUnique({
        where: { id: attempt.id },
        select: { status: true },
      });
      if (payment?.status === "SUCCEEDED") return;
      if (payment?.status !== "PROCESSING") {
        throw new Error("Vendor subscription payment is not ready for fulfillment");
      }

      const store = await tx.store.findUnique({
        where: { id: attempt.targetId },
        select: { ownerId: true, subscriptionPlan: true, planRenewsAt: true },
      });
      if (!store || store.ownerId !== attempt.userId) {
        throw new Error("Vendor subscription store is unavailable");
      }
      if (store.subscriptionPlan === "PRO" && targetPlan === "GROWTH") {
        throw new Error("Paid vendor plan downgrades are not supported");
      }

      const now = new Date();
      const renewalBase = store.planRenewsAt && store.planRenewsAt > now
        ? store.planRenewsAt
        : now;
      await tx.store.update({
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
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: "SUCCEEDED", activeKey: null, paidAt: now },
      });
    }, { isolationLevel: "Serializable" });
    return;
  }

  if (attempt.purpose === "SERVICE_SUBSCRIPTION") {
    const data = attempt.providerData as {
      storeId?: string;
      interval?: string;
      subscriptionId?: string;
      regularPriceMinor?: number;
      trialDays?: number;
      sessionsIncluded?: number | null;
      cancellationNoticeDays?: number;
      canPause?: boolean;
      pauseMaxWeeks?: number | null;
    } | null;
    if (!data?.storeId || !data.interval) {
      throw new Error("Service subscription payment metadata is incomplete");
    }
    const storeId = data.storeId;
    const interval = data.interval;
    const regularPriceMinor =
      Number.isInteger(data.regularPriceMinor) && (data.regularPriceMinor ?? 0) > 0
        ? data.regularPriceMinor!
        : attempt.amountMinor;
    const trialDays =
      !data.subscriptionId && Number.isInteger(data.trialDays) && (data.trialDays ?? 0) > 0
        ? data.trialDays!
        : 0;
    const sessionsIncluded = data.sessionsIncluded === null
      ? null
      : Number.isInteger(data.sessionsIncluded) && (data.sessionsIncluded ?? 0) > 0
        ? data.sessionsIncluded!
        : undefined;
    const cancellationNoticeDays =
      Number.isInteger(data.cancellationNoticeDays) && (data.cancellationNoticeDays ?? 0) >= 0
        ? data.cancellationNoticeDays!
        : undefined;
    const canPause = data.canPause === undefined
      ? undefined
      : data.canPause === true && Number.isInteger(data.pauseMaxWeeks) && (data.pauseMaxWeeks ?? 0) > 0;
    const pauseMaxWeeks = canPause === undefined ? undefined : canPause ? data.pauseMaxWeeks! : null;
    await prisma.$transaction(async (tx) => {
    // A provider return can be replayed before the payment attempt is marked
    // succeeded. Keep the service period and its earnings exactly-once together.
    const settled = await tx.vendorLedgerEntry.findUnique({
      where: { idempotencyKey: `service-subscription:${attempt.id}` },
      select: { id: true },
    });
    if (settled) return;
    const store = await tx.store.findUnique({
      where: { id: storeId },
      select: { subscriptionPlan: true },
    });
    if (!store) throw new Error("Service subscription store was not found");
    const existing = data.subscriptionId
      ? await tx.customerServiceSubscription.findFirst({
          where: { id: data.subscriptionId, customerId: attempt.userId },
        })
      : await tx.customerServiceSubscription.findFirst({
          where: { customerId: attempt.userId, productId: attempt.targetId },
          orderBy: { createdAt: "desc" },
        });
    const now = new Date();
    const renewalBase = existing?.currentPeriodEnd && existing.currentPeriodEnd > now
      ? existing.currentPeriodEnd
      : now;
    const periodEnd = trialDays > 0
      ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1_000)
      : addInterval(renewalBase, interval);
    if (existing) {
      await tx.customerServiceSubscription.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
          nextChargeAt: periodEnd,
          lastChargeAt: now,
          priceMinor: regularPriceMinor,
          interval,
          sessionsIncluded: sessionsIncluded ?? existing.sessionsIncluded,
          sessionsRemaining: sessionsIncluded === undefined ? existing.sessionsIncluded : sessionsIncluded,
          cancellationNoticeDays: cancellationNoticeDays ?? existing.cancellationNoticeDays,
          canPause: canPause ?? existing.canPause,
          pauseMaxWeeks: pauseMaxWeeks === undefined ? existing.pauseMaxWeeks : pauseMaxWeeks,
          pausedAt: null,
          pauseEndsAt: null,
          pauseUsedSeconds: 0,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          wipayTrustedCardId: attempt.trustedCardId ?? existing.wipayTrustedCardId,
          stripeSubscriptionId: null,
        },
      });
    } else {
      await tx.customerServiceSubscription.create({
        data: {
          customerId: attempt.userId,
          productId: attempt.targetId,
          storeId,
          priceMinor: regularPriceMinor,
          interval,
          sessionsIncluded: sessionsIncluded ?? null,
          sessionsRemaining: sessionsIncluded ?? null,
          cancellationNoticeDays: cancellationNoticeDays ?? 0,
          canPause: canPause ?? false,
          pauseMaxWeeks: pauseMaxWeeks ?? null,
          currentPeriodEnd: periodEnd,
          nextChargeAt: periodEnd,
          lastChargeAt: now,
          trialStartedAt: trialDays > 0 ? now : null,
          trialEndsAt: trialDays > 0 ? periodEnd : null,
          wipayTrustedCardId: attempt.trustedCardId,
        },
      });
    }
    await createVendorEarningsLedgerPair(tx, {
      storeId,
      ledgerEntryType: "SERVICE_SUBSCRIPTION_RENEWAL",
      grossTTD: attempt.amountMinor / 100,
      itemType: "service",
      plan: resolveVendorPlan(store.subscriptionPlan),
      idempotencyKey: `service-subscription:${attempt.id}`,
      description: "Customer service subscription payment",
      metadata: { paymentAttemptId: attempt.id, productId: attempt.targetId },
    });
    }, { isolationLevel: "Serializable" });
  }
}
