import { cache } from "react";

import { prisma } from "@/lib/prisma";

/** Badge counts shown in vendor sidebar nav (counts only; cached per request). */
export const getVendorNavCounts = cache(async (storeId: string) => {
  const pendingRequestStatuses = ["PENDING"] as const;

  const [pendingRequestsCount, activeOrdersCount] = await Promise.all([
    prisma.onDemandRequest.count({
      where: { storeId, status: { in: [...pendingRequestStatuses] } },
    }),
    prisma.splitOrder.count({
      where: {
        storeId,
        status: {
          notIn: ["DELIVERED", "CANCELLED"],
        },
      },
    }),
  ]);

  return { pendingRequestsCount, activeOrdersCount };
});
