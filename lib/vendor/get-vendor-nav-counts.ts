import { cache } from "react";

import { prisma } from "@/lib/prisma";

/** Badge counts shown in vendor sidebar nav (counts only; cached per request). */
export const getVendorNavCounts = cache(async (storeId: string) => {
  const pendingRequestStatuses = ["PENDING"] as const;

  const [pendingRequestsCount, pendingBookings, subscriptionAttention, activeOrdersCount] = await Promise.all([
    prisma.onDemandRequest.count({
      where: { storeId, status: { in: [...pendingRequestStatuses, "REFUND_PENDING"] } },
    }),
    prisma.productBooking.count({ where: { product: { storeId, isService: true }, cancelledAt: null, status: { in: ["PENDING", "DEPOSIT_PAID"] } } }),
    prisma.customerServiceSubscription.count({ where: { storeId, OR: [{ status: "PAST_DUE" }, { status: "ACTIVE", OR: [{ sessionsRemaining: 0 }, { currentPeriodEnd: { lte: new Date() } }] }] } }),
    prisma.splitOrder.count({
      where: {
        storeId,
        status: { in: ["AWAITING_VENDOR_ACTION", "PREPARING"] },
        vendorInboundMethod: null,
        mainOrder: { status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED", "REFUNDED"] } },
      },
    }),
  ]);

  return { pendingRequestsCount, activeOrdersCount, serviceDeskCount: pendingRequestsCount + pendingBookings + subscriptionAttention };
});
