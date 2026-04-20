"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCourierPickupFeeMinor } from "@/lib/fulfillment/courier-pickup-rates";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateCommissionMinor, calculateVendorNetMinor } from "@/lib/platform/commission";

export async function markItemsReceivedAtWarehouse(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) redirect("/");

  const splitOrder = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: { id: true, mainOrderId: true, storeId: true, subtotalMinor: true, vendorInboundMethod: true },
  });

  if (!splitOrder) redirect("/");

  await prisma.$transaction(async (tx) => {
    await tx.splitOrder.update({
      where: { id: splitOrderId },
      data: {
        status: "AT_WAREHOUSE",
        warehouseReceivedAt: new Date(),
      },
    });

    const commissionMinor = calculateCommissionMinor(splitOrder.subtotalMinor);
    const vendorNetMinor = calculateVendorNetMinor(splitOrder.subtotalMinor);

    await tx.vendorLedgerEntry.create({
      data: {
        storeId: splitOrder.storeId,
        currency: "TTD",
        entryType: "CREDIT_ORDER_SETTLEMENT",
        ledgerEntryType: "ORDER_REVENUE",
        amountMinor: vendorNetMinor,
        splitOrderId: splitOrderId,
        splitOrderRef: splitOrderId,
        description: `Revenue from order — items received at warehouse`,
      },
    });

    await tx.vendorLedgerEntry.create({
      data: {
        storeId: splitOrder.storeId,
        currency: "TTD",
        entryType: "DEBIT_PLATFORM_FEE",
        ledgerEntryType: "PLATFORM_COMMISSION",
        amountMinor: commissionMinor,
        splitOrderId: splitOrderId,
        splitOrderRef: splitOrderId,
        description: `Platform commission 12% on order`,
      },
    });

    if (splitOrder.vendorInboundMethod === "PICKUP_REQUESTED") {
      const store = await tx.store.findUnique({
        where: { id: splitOrder.storeId },
        select: { region: true },
      });
      const feeMinor = getCourierPickupFeeMinor(store?.region ?? "");

      await tx.vendorLedgerEntry.create({
        data: {
          storeId: splitOrder.storeId,
          currency: "TTD",
          entryType: "DEBIT_PLATFORM_FEE",
          ledgerEntryType: "COURIER_PICKUP_FEE",
          amountMinor: feeMinor,
          splitOrderId: splitOrderId,
          splitOrderRef: splitOrderId,
          description: `Courier pickup fee deducted`,
        },
      });
    }
  });

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath(`/orders/${splitOrder.mainOrderId}`, "page");
  revalidatePath("/");
}
