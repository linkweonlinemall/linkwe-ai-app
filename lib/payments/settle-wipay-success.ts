import { NotificationType, type PaymentAttempt } from "@prisma/client";

import { alertAdmins } from "@/lib/admin/alerts";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { createNotification } from "@/lib/notifications/create";
import { fulfillWiPayAttempt } from "@/lib/payments/fulfill-wipay-attempt";
import { prisma } from "@/lib/prisma";
import { requestWiPayRefund } from "@/lib/wipay/wapi";
import { expireCheckoutAttempt } from "@/lib/payments/checkout-expiry";
import { isStoreSellable } from "@/lib/store/sellable-store";
import type { CouponSnapshot } from "@/lib/coupons/pricing";

export type WiPaySuccessOutcome =
  | "fulfilled"
  | "already_fulfilled"
  | "processing"
  | "refunded_closed_or_expired";

async function targetIsClosed(attempt: PaymentAttempt): Promise<boolean> {
  if (attempt.purpose === "PRODUCT_BOOKING") {
    const booking = await prisma.productBooking.findUnique({
      where: { id: attempt.targetId },
      select: { status: true, cancelledAt: true },
    });
    return (
      !booking ||
      Boolean(booking.cancelledAt) ||
      ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status)
    );
  }

  if (attempt.purpose === "ON_DEMAND_SERVICE") {
    const request = await prisma.onDemandRequest.findUnique({
      where: { id: attempt.targetId },
      select: { status: true },
    });
    return (
      !request ||
      ["CANCELLED", "DECLINED", "COMPLETED", "REFUND_PENDING"].includes(request.status)
    );
  }

  if (attempt.purpose === "VENDOR_SUBSCRIPTION") {
    const data = attempt.providerData as { targetPlan?: string } | null;
    const targetPlan = data?.targetPlan;
    if (targetPlan !== "GROWTH" && targetPlan !== "PRO") return true;
    const store = await prisma.store.findUnique({
      where: { id: attempt.targetId },
      select: { ownerId: true, subscriptionPlan: true },
    });
    return (
      !store ||
      store.ownerId !== attempt.userId ||
      attempt.amountMinor !== PLAN_PRICE_MINOR[targetPlan] ||
      (store.subscriptionPlan === "PRO" && targetPlan === "GROWTH")
    );
  }

  if (attempt.purpose === "SERVICE_SUBSCRIPTION") {
    const data = attempt.providerData as {
      storeId?: string;
      interval?: string;
      subscriptionId?: string;
      regularPriceMinor?: number;
      trialDays?: number;
      coupon?: CouponSnapshot;
    } | null;
    if (
      !data?.storeId ||
      !data.interval ||
      !["weekly", "fortnightly", "monthly", "quarterly"].includes(data.interval)
    ) {
      return true;
    }
    const product = await prisma.product.findUnique({
      where: { id: attempt.targetId },
      select: {
        isService: true,
        serviceType: true,
        isPublished: true,
        isArchived: true,
        isAvailable: true,
        price: true,
        subscriptionTrialPeriod: true,
        subscriptionTrialPrice: true,
        storeId: true,
        store: {
          select: {
            status: true,
            ownerId: true,
            owner: { select: { idVerificationStatus: true } },
          },
        },
      },
    });
    if (
      !product ||
      !product.isService ||
      product.serviceType !== "SUBSCRIPTION" ||
      !product.isPublished ||
      product.isArchived ||
      !product.isAvailable ||
      product.storeId !== data.storeId ||
      product.store.ownerId === attempt.userId ||
      !isStoreSellable(product.store)
    ) {
      return true;
    }
    if (!data.subscriptionId) {
      const regularPriceMinor = Math.round(product.price * 100);
      if (data.regularPriceMinor != null && data.regularPriceMinor !== regularPriceMinor) return true;
      const trialDays = data.trialDays ?? 0;
      if (trialDays > 0 && trialDays !== product.subscriptionTrialPeriod) return true;
      const originalMinor = trialDays > 0
        ? Math.round((product.subscriptionTrialPrice ?? 0) * 100)
        : regularPriceMinor;
      // This snapshot was written by checkout. Honour an accepted discount even
      // if the vendor subsequently pauses or edits the coupon before the callback.
      const coupon = data.coupon;
      if (coupon) {
        if (
          coupon.storeId !== data.storeId ||
          coupon.subtotalMinor !== originalMinor ||
          !Number.isSafeInteger(coupon.discountMinor) ||
          coupon.discountMinor <= 0 || coupon.discountMinor > originalMinor ||
          coupon.totalMinor !== originalMinor - coupon.discountMinor ||
          !Array.isArray(coupon.eligibleKeys) ||
          !coupon.eligibleKeys.includes(`service:${attempt.targetId}`)
        ) return true;
        return attempt.amountMinor !== coupon.totalMinor;
      }
      return attempt.amountMinor !== originalMinor;
    }
    const subscription = await prisma.customerServiceSubscription.findFirst({
      where: {
        id: data.subscriptionId,
        customerId: attempt.userId,
        productId: attempt.targetId,
        storeId: data.storeId,
      },
      select: { status: true, priceMinor: true, interval: true, cancelAtPeriodEnd: true },
    });
    return (
      !subscription ||
      subscription.status === "PAUSED" ||
      subscription.status === "CANCELED" ||
      subscription.cancelAtPeriodEnd ||
      subscription.priceMinor !== attempt.amountMinor ||
      subscription.interval !== data.interval
    );
  }

  return false;
}

async function refundClosedOrExpiredPayment(attempt: PaymentAttempt) {
  if (!attempt.providerTransactionId) {
    throw new Error("A successful expired payment has no provider transaction ID");
  }

  await requestWiPayRefund(attempt.providerTransactionId);
  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "REFUND_REQUESTED",
      activeKey: null,
      paidAt: new Date(),
      failureMessage: "Successful payment arrived after checkout expiry or target closure",
    },
  });

  await Promise.allSettled([
    createNotification({
      userId: attempt.userId,
      type: NotificationType.GENERAL,
      title: "Payment automatically refunded",
      body: "This payment arrived after the checkout closed, so LinkWe immediately requested a full refund to your card.",
      linkUrl:
        attempt.purpose === "PRODUCT_BOOKING"
          ? "/bookings"
          : attempt.purpose === "SERVICE_SUBSCRIPTION"
            ? "/dashboard/customer/subscriptions"
            : attempt.purpose === "VENDOR_SUBSCRIPTION"
              ? "/dashboard/vendor/finance"
              : "/my-requests",
    }),
    alertAdmins({
      title: "Late service payment automatically refunded",
      body: `Payment ${attempt.merchantOrderId} succeeded after its checkout or service target closed. A full WiPay refund was requested.`,
      linkUrl: "/dashboard/admin?tab=orders",
    }),
  ]);
}

/**
 * Claims a verified successful WiPay callback before fulfillment. Checkout
 * expiry can only claim PENDING attempts, so PROCESSING and EXPIRED are
 * mutually exclusive outcomes even when the cron and callback race.
 */
export async function settleVerifiedWiPaySuccess(
  attemptId: string,
): Promise<WiPaySuccessOutcome> {
  let attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new Error("Payment attempt not found");

  if (attempt.status === "PENDING" && attempt.expiresAt && attempt.expiresAt <= new Date()) {
    await expireCheckoutAttempt(attempt.id);
    attempt = await prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
    if (!attempt) throw new Error("Expired payment attempt disappeared");
  }

  if (attempt.status === "SUCCEEDED") return "already_fulfilled";
  if (attempt.status === "REFUND_REQUESTED" || attempt.status === "REFUNDED") {
    return "refunded_closed_or_expired";
  }

  if (attempt.status === "EXPIRED" || (await targetIsClosed(attempt))) {
    await refundClosedOrExpiredPayment(attempt);
    return "refunded_closed_or_expired";
  }

  const staleProcessingBefore = new Date(Date.now() - 5 * 60 * 1_000);
  if (attempt.status === "PROCESSING" && attempt.updatedAt > staleProcessingBefore) {
    return "processing";
  }

  const claimed = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      OR: [
        { status: { in: ["PENDING", "FAILED", "ERROR"] } },
        { status: "PROCESSING", updatedAt: { lte: staleProcessingBefore } },
      ],
    },
    data: { status: "PROCESSING", failureMessage: null },
  });
  if (claimed.count !== 1) {
    attempt = await prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
    if (attempt?.status === "SUCCEEDED") return "already_fulfilled";
    if (attempt?.status === "EXPIRED" && attempt) {
      await refundClosedOrExpiredPayment(attempt);
      return "refunded_closed_or_expired";
    }
    return "processing";
  }

  attempt = await prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
  if (!attempt) throw new Error("Claimed payment attempt disappeared");

  if (await targetIsClosed(attempt)) {
    await refundClosedOrExpiredPayment(attempt);
    return "refunded_closed_or_expired";
  }

  try {
    await fulfillWiPayAttempt(attempt);
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PROCESSING" },
      data: { status: "SUCCEEDED", activeKey: null, paidAt: new Date() },
    });
    return "fulfilled";
  } catch (error) {
    if (await targetIsClosed(attempt)) {
      await refundClosedOrExpiredPayment(attempt);
      return "refunded_closed_or_expired";
    }
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PROCESSING" },
      data: {
        status: "ERROR",
        failureMessage: error instanceof Error ? error.message.slice(0, 500) : "Fulfillment failed",
      },
    });
    throw error;
  }
}
