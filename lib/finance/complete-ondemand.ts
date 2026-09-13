import { NotificationType } from "@prisma/client";

import { calculateEarnings } from "@/lib/finance/commission";
import { createVendorEarningsLedgerPair } from "@/lib/finance/release-earnings";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { createNotification } from "@/lib/notifications/create";
import { prisma } from "@/lib/prisma";

export async function releaseOnDemandEarnings(
  requestId: string,
  markedCompleteBy: string,
  ledgerType: "ON_DEMAND_COMPLETE" | "ON_DEMAND_AUTO_COMPLETE" = "ON_DEMAND_COMPLETE",
) {
  const request = await prisma.onDemandRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      vendorCompletedAt: true,
      earningsReleased: true,
      amountPaid: true,
      store: {
        select: { id: true, ownerId: true, subscriptionPlan: true },
      },
    },
  });

  if (
    !request ||
    request.status !== "CONFIRMED" ||
    !request.vendorCompletedAt ||
    request.earningsReleased
  ) {
    return { ok: false as const, error: "Request not eligible" };
  }

  const grossTTD = Math.max(0, request.amountPaid ?? 0);
  const plan = resolveVendorPlan(request.store.subscriptionPlan);
  const { net } = calculateEarnings(grossTTD, "service", plan);
  const now = new Date();

  const released = await prisma.$transaction(async (tx) => {
    const transitioned = await tx.onDemandRequest.updateMany({
      where: { id: request.id, status: "CONFIRMED", earningsReleased: false },
      data: {
        status: "COMPLETED",
        completedAt: now,
        markedCompleteBy,
        earningsReleased: true,
        earningsAmount: net,
        autoCompleteAt: null,
      },
    });
    if (transitioned.count !== 1) return false;

    if (grossTTD > 0) {
      await createVendorEarningsLedgerPair(tx, {
        storeId: request.store.id,
        ledgerEntryType: ledgerType,
        grossTTD,
        itemType: "service",
        plan,
        idempotencyKey: `ondemand:${request.id}:complete`,
        description:
          ledgerType === "ON_DEMAND_AUTO_COMPLETE"
            ? "On-demand service auto-completed after customer review window"
            : "On-demand service confirmed complete by customer",
        markedByUserId: markedCompleteBy === "SYSTEM" ? undefined : markedCompleteBy,
        metadata: { onDemandRequestId: request.id },
      });
    }
    return true;
  });

  if (!released) return { ok: false as const, error: "Request not eligible" };

  await createNotification({
    userId: request.store.ownerId,
    type: NotificationType.PAYOUT_PROCESSED,
    title:
      ledgerType === "ON_DEMAND_AUTO_COMPLETE"
        ? "On-demand job auto-completed"
        : "Customer confirmed service completion",
    body:
      grossTTD > 0
        ? `TTD ${net.toFixed(2)} added to your balance`
        : "The service is now marked complete.",
    linkUrl: "/dashboard/vendor/requests",
  });

  return { ok: true as const, net };
}
