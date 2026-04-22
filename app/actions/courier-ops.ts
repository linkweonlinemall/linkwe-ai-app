"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getCourierPickupFeeMinor } from "@/lib/fulfillment/courier-pickup-rates";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

type ClaimTxResult =
  | { ok: true; mainOrderId: string | undefined }
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

      if (shipment.inboundForSplitOrder) {
        await tx.splitOrder.update({
          where: { id: shipment.inboundForSplitOrder.id },
          data: { status: "COURIER_ASSIGNED" },
        });
      }

      return {
        ok: true,
        mainOrderId: shipment.inboundForSplitOrder?.mainOrderId,
      } as ClaimTxResult;
    });

    if (result.ok && result.mainOrderId) {
      await recalculateMainOrderStatus(result.mainOrderId);
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

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: "COURIER_PICKED_UP",
        pickedUpAt: new Date(),
      },
    });

    if (shipment.inboundForSplitOrder) {
      await tx.splitOrder.update({
        where: { id: shipment.inboundForSplitOrder.id },
        data: { status: "COURIER_PICKED_UP" },
      });
    }
  });

  if (shipment.inboundForSplitOrder?.mainOrderId) {
    await recalculateMainOrderStatus(shipment.inboundForSplitOrder.mainOrderId);
    revalidatePath(`/orders/${shipment.inboundForSplitOrder.mainOrderId}`, "page");
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

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        shipmentStatus: "DELIVERED_TO_WAREHOUSE",
        deliveredAt: new Date(),
      },
    });

    if (shipment.inboundForSplitOrder) {
      await tx.splitOrder.update({
        where: { id: shipment.inboundForSplitOrder.id },
        data: {
          status: "AT_WAREHOUSE",
          warehouseReceivedAt: new Date(),
        },
      });
    }
  });

  if (shipment.inboundForSplitOrder?.mainOrderId) {
    await recalculateMainOrderStatus(shipment.inboundForSplitOrder.mainOrderId);
    revalidatePath(`/orders/${shipment.inboundForSplitOrder.mainOrderId}`, "page");
  }

  const storeId = shipment.inboundForSplitOrder?.storeId;
  const store = storeId
    ? await prisma.store.findUnique({
        where: { id: storeId },
        select: { region: true },
      })
    : null;

  const earningMinor = getCourierPickupFeeMinor(store?.region ?? shipment.region ?? "");

  if (earningMinor > 0) {
    await prisma.courierLedgerEntry.create({
      data: {
        courierId: shipment.courierId,
        amountMinor: earningMinor,
        currency: "TTD",
        entryType: "PICKUP_EARNING",
        shipmentId: shipmentId,
        description: `Pickup earning — ${shipment.region ?? "unknown"} zone`,
      },
    });
  }

  revalidatePath("/dashboard/courier");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin");
}
