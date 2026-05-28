import { NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
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
      earningsReleased: true,
      status: true,
      store: { select: { ownerId: true, subscriptionPlan: true } },
    },
  });

  if (!split || split.earningsReleased) {
    return { ok: false as const, error: "Order not eligible" };
  }

  if (split.status !== "DELIVERED" && split.status !== "COMPLETED") {
    return { ok: false as const, error: "Order not delivered" };
  }

  const plan = resolveVendorPlan(split.store.subscriptionPlan);
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
          : "Customer confirmed receipt",
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
          : "Customer marked order received",
      body: "Earnings added to your balance",
      linkUrl: "/dashboard/vendor/finance",
    });
  }

  return { ok: true as const };
}
