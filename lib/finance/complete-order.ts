import { NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { earningsReleasedVendorEmail } from "@/lib/email/templates";
import { calculateEarningsMinor } from "@/lib/finance/commission";
import { createProductOrderEarningsLedger } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";

const AUTO_COMPLETE_DAYS = 7;

export function getOrderAutoCompleteAt(deliveredAt: Date): Date {
  return new Date(deliveredAt.getTime() + AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000);
}

export async function setSplitOrderDeliveredWithAutoComplete(
  splitOrderId: string,
  deliveredAt = new Date(),
) {
  await prisma.splitOrder.update({
    where: { id: splitOrderId },
    data: {
      status: "DELIVERED",
      deliveredAt,
      autoCompleteAt: getOrderAutoCompleteAt(deliveredAt),
    },
  });
}

export async function releaseSplitOrderEarnings(
  splitOrderId: string,
  markedCompleteBy: string,
  ledgerType: "ORDER_REVENUE" | "ORDER_AUTO_COMPLETE" = "ORDER_REVENUE",
) {
  const split = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: {
      id: true,
      mainOrderId: true,
      storeId: true,
      subtotalMinor: true,
      shippingMinor: true,
      earningsReleased: true,
      status: true,
      mainOrder: { select: { referenceNumber: true } },
      store: {
        select: {
          ownerId: true,
          subscriptionPlan: true,
          owner: { select: { email: true, fullName: true } },
        },
      },
    },
  });

  if (!split || split.earningsReleased) {
    return { ok: false as const, error: "Order not eligible" };
  }

  if (split.status !== "DELIVERED" && split.status !== "COMPLETED") {
    return { ok: false as const, error: "Order not delivered" };
  }

  const plan = resolveVendorPlan(split.store.subscriptionPlan);
  const earnings = calculateEarningsMinor(split.subtotalMinor, "product", plan);
  // LinkWe fulfils every delivered order. Shipping is not vendor revenue;
  // vendors can only offer free customer pickup.
  const selfDeliveryMinor = 0;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.splitOrder.update({
      where: { id: splitOrderId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        markedCompleteBy,
        earningsReleased: true,
      },
    });

    await createProductOrderEarningsLedger(tx, {
      storeId: split.storeId,
      splitOrderId: split.id,
      mainOrderId: split.mainOrderId,
      subtotalMinor: split.subtotalMinor,
      plan,
      ledgerEntryType: ledgerType,
      idempotencyKey: `split:${split.id}:${ledgerType}`,
      description:
        ledgerType === "ORDER_AUTO_COMPLETE"
          ? "Order auto-completed after delivery window"
          : "Order completed",
      markedByUserId: markedCompleteBy === "SYSTEM" ? undefined : markedCompleteBy,
    });

  });

  if (split.store.ownerId) {
    await createNotification({
      userId: split.store.ownerId,
      type: NotificationType.PAYOUT_PROCESSED,
      title:
        ledgerType === "ORDER_AUTO_COMPLETE"
          ? "Order auto-completed"
          : "Order completed — earnings released",
      body: "Earnings added to your balance",
      linkUrl: "/dashboard/vendor/finance",
    });

    const earningsTemplate = earningsReleasedVendorEmail({
      vendorName: split.store.owner.fullName ?? "Vendor",
      orderRef: split.mainOrder.referenceNumber ?? split.mainOrderId,
      grossTTD: earnings.grossMinor / 100,
      commissionTTD: earnings.commissionMinor / 100,
      shippingTTD: selfDeliveryMinor / 100,
      netTTD: (earnings.netMinor + selfDeliveryMinor) / 100,
      financeUrl: `${BASE_URL}/dashboard/vendor/finance`,
    });
    await sendEmail({
      to: split.store.owner.email,
      ...earningsTemplate,
    });
  }

  return { ok: true as const };
}
