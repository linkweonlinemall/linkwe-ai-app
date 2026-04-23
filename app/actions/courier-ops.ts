"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  getCourierPickupFeeLabel,
  getCourierPickupFeeMinor,
} from "@/lib/fulfillment/courier-pickup-rates";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

type ClaimTxResult =
  | { ok: true; mainOrderIds: string[] }
  | { ok: false; error: string };

export async function claimPickup(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") return { ok: false, error: "unauthorized" };

  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  if (!shipmentId) return { ok: false, error: "missing_shipment" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        select: {
          id: true,
          shipmentStatus: true,
          inboundForSplitOrder: {
            select: { id: true, mainOrderId: true },
          },
        },
      });

      if (!shipment) return { ok: false, error: "not_found" } as ClaimTxResult;
      if (shipment.shipmentStatus !== "AWAITING_COURIER_CLAIM") {
        return { ok: false, error: "already_claimed" } as ClaimTxResult;
      }

      const updated = await tx.shipment.updateMany({
        where: {
          id: shipmentId,
          shipmentStatus: "AWAITING_COURIER_CLAIM",
        },
        data: {
          shipmentStatus: "COURIER_ASSIGNED",
          courierId: session.userId,
          claimedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return { ok: false, error: "already_claimed" } as ClaimTxResult;
      }

      const batchUpdated = await tx.splitOrder.updateMany({
        where: { inboundShipmentId: shipmentId },
        data: { status: "COURIER_ASSIGNED" },
      });

      if (batchUpdated.count === 0 && shipment.inboundForSplitOrder) {
        await tx.splitOrder.update({
          where: { id: shipment.inboundForSplitOrder.id },
          data: { status: "COURIER_ASSIGNED" },
        });
      }

      const whereOr: { inboundShipmentId?: string; id?: string }[] = [{ inboundShipmentId: shipmentId }];
      if (shipment.inboundForSplitOrder) {
        whereOr.push({ id: shipment.inboundForSplitOrder.id });
      }
      const mains = await tx.splitOrder.findMany({
        where: { OR: whereOr },
        select: { mainOrderId: true },
      });

      return {
        ok: true,
        mainOrderIds: [...new Set(mains.map((m) => m.mainOrderId))],
      } as ClaimTxResult;
    });

    if (result.ok) {
      for (const mainOrderId of result.mainOrderIds) {
        await recalculateMainOrderStatus(mainOrderId);
      }
    }

    revalidatePath("/dashboard/courier");
    return { ok: result.ok, error: result.ok ? undefined : result.error };
  } catch {
    return { ok: false, error: "transaction_failed" };
  }
}

export async function markPickedUp(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "COURIER") redirect("/");

  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  if (!shipmentId) redirect("/dashboard/courier");

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      courierId: session.userId,
      shipmentStatus: "COURIER_ASSIGNED",
    },
    select: {
      id: true,
      inboundForSplitOrder: {
        select: { id: true, mainOrderId: true },
      },
    },
  });

  if (!shipment) redirect("/dashboard/courier");

  const mainOrderIds = await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: "COURIER_PICKED_UP",
        pickedUpAt: new Date(),
      },
    });

    const batchUpdated = await tx.splitOrder.updateMany({
      where: { inboundShipmentId: shipmentId },
      data: { status: "COURIER_PICKED_UP" },
    });

    if (batchUpdated.count === 0 && shipment.inboundForSplitOrder) {
      await tx.splitOrder.update({
        where: { id: shipment.inboundForSplitOrder.id },
        data: { status: "COURIER_PICKED_UP" },
      });
    }

    const whereOr: { inboundShipmentId?: string; id?: string }[] = [{ inboundShipmentId: shipmentId }];
    if (shipment.inboundForSplitOrder) {
      whereOr.push({ id: shipment.inboundForSplitOrder.id });
    }
    const mains = await tx.splitOrder.findMany({
      where: { OR: whereOr },
      select: { mainOrderId: true },
    });

    return [...new Set(mains.map((m) => m.mainOrderId))];
  });

  for (const mainOrderId of mainOrderIds) {
    await recalculateMainOrderStatus(mainOrderId);
    revalidatePath(`/orders/${mainOrderId}`, "page");
  }

  revalidatePath("/dashboard/courier");
  redirect("/dashboard/courier");
}

export async function markDeliveredToWarehouse(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const shipmentId = String(formData.get("shipmentId") ?? "").trim();
  if (!shipmentId) redirect("/dashboard/admin");

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      shipmentStatus: "COURIER_PICKED_UP",
    },
    select: {
      id: true,
      courierId: true,
      region: true,
      pickupFeeMinor: true,
      totalWeightLbs: true,
      inboundForSplitOrder: {
        select: {
          id: true,
          mainOrderId: true,
          storeId: true,
          store: { select: { region: true } },
        },
      },
    },
  });

  if (!shipment?.courierId) redirect("/dashboard/admin");

  const courierId = shipment.courierId;

  const mainOrderIds = await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: "DELIVERED_TO_WAREHOUSE",
        deliveredAt: new Date(),
      },
    });

    const receivedAt = new Date();
    const batchUpdated = await tx.splitOrder.updateMany({
      where: { inboundShipmentId: shipmentId },
      data: {
        status: "AT_WAREHOUSE",
        warehouseReceivedAt: receivedAt,
      },
    });

    if (batchUpdated.count === 0 && shipment.inboundForSplitOrder) {
      await tx.splitOrder.update({
        where: { id: shipment.inboundForSplitOrder.id },
        data: {
          status: "AT_WAREHOUSE",
          warehouseReceivedAt: receivedAt,
        },
      });
    }

    const region = shipment.inboundForSplitOrder?.store.region ?? shipment.region ?? "";
    const weightForFee = shipment.totalWeightLbs ?? 1;
    const earningMinor =
      shipment.pickupFeeMinor ?? getCourierPickupFeeMinor(region, weightForFee);

    const existingEarning = await tx.courierLedgerEntry.findFirst({
      where: {
        shipmentId,
        entryType: "PICKUP_EARNING",
      },
    });

    if (!existingEarning && earningMinor > 0) {
      await tx.courierLedgerEntry.create({
        data: {
          courierId,
          amountMinor: earningMinor,
          currency: "TTD",
          entryType: "PICKUP_EARNING",
          shipmentId,
          description: getCourierPickupFeeLabel(region, weightForFee),
        },
      });
    }

    const whereOr: { inboundShipmentId?: string; id?: string }[] = [{ inboundShipmentId: shipmentId }];
    if (shipment.inboundForSplitOrder) {
      whereOr.push({ id: shipment.inboundForSplitOrder.id });
    }
    const mains = await tx.splitOrder.findMany({
      where: { OR: whereOr },
      select: { mainOrderId: true },
    });

    return [...new Set(mains.map((m) => m.mainOrderId))];
  });

  for (const mainOrderId of mainOrderIds) {
    await recalculateMainOrderStatus(mainOrderId);
    revalidatePath(`/orders/${mainOrderId}`, "page");
  }

  revalidatePath("/dashboard/courier");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin");
}
