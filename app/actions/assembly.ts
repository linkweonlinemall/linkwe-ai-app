"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { recalculateMainOrderStatus } from "@/lib/fulfillment/order-status";
import { prisma } from "@/lib/prisma";

export async function markPackaged(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const splitOrderId = String(formData.get("splitOrderId") ?? "").trim();
  if (!splitOrderId) return;

  const splitOrder = await prisma.splitOrder.findUnique({
    where: { id: splitOrderId },
    select: { id: true, mainOrderId: true, status: true },
  });

  if (!splitOrder) return;
  if (!["AT_WAREHOUSE", "PACKAGED"].includes(splitOrder.status)) return;

  const newStatus = splitOrder.status === "PACKAGED" ? "AT_WAREHOUSE" : "PACKAGED";

  await prisma.splitOrder.update({
    where: { id: splitOrderId },
    data: {
      status: newStatus,
      packagedAt: newStatus === "PACKAGED" ? new Date() : null,
    },
  });

  if (newStatus === "PACKAGED") {
    const bay = await prisma.dockBay.findFirst({
      where: { splitOrderId: splitOrderId },
    });

    if (bay) {
      await prisma.$transaction([
        prisma.dockBay.update({
          where: { id: bay.id },
          data: {
            isOccupied: false,
            splitOrderId: null,
            assignedAt: null,
          },
        }),
        prisma.splitOrder.update({
          where: { id: splitOrderId },
          data: { bayNumber: null },
        }),
      ]);
    }
  }

  await recalculateMainOrderStatus(splitOrder.mainOrderId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/orders/[orderId]", "page");
  revalidatePath("/orders");
}

export async function bundleAndDispatch(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const mainOrderId = String(formData.get("mainOrderId") ?? "").trim();
  if (!mainOrderId) return;

  const splitOrders = await prisma.splitOrder.findMany({
    where: { mainOrderId },
    select: { id: true, status: true, storeId: true, subtotalMinor: true },
  });

  const allPackaged = splitOrders.every(
    (so) =>
      so.status === "PACKAGED" || so.status === "BUNDLED_FOR_DISPATCH" || so.status === "DISPATCHED",
  );

  if (!allPackaged) return;

  let warehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        name: "LinkWe Main Warehouse",
        code: "LINKWE_MAIN",
        isActive: true,
      },
      select: { id: true },
    });
  }

  await prisma.$transaction(async (tx) => {
    const bundle = await tx.shippingBundle.create({
      data: {
        mainOrderId,
        warehouseId: warehouse.id,
        status: "OPEN",
        bundledAt: new Date(),
      },
    });

    await tx.splitOrder.updateMany({
      where: { mainOrderId, status: "PACKAGED" },
      data: {
        status: "DISPATCHED",
        shippingBundleId: bundle.id,
      },
    });
  });

  await recalculateMainOrderStatus(mainOrderId);
  revalidatePath("/dashboard/admin");
  revalidatePath("/orders");
}
