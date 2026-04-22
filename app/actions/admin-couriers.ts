"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getAdminCouriers() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const couriers = await prisma.user.findMany({
    where: { role: "COURIER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      region: true,
      phone: true,
      createdAt: true,
      courierLocation: {
        select: {
          latitude: true,
          longitude: true,
          isActive: true,
          updatedAt: true,
        },
      },
      courierBankDetails: {
        select: {
          bankName: true,
          accountName: true,
          accountNumber: true,
          accountType: true,
        },
      },
      courierLedger: {
        select: {
          id: true,
          amountMinor: true,
          entryType: true,
          description: true,
          createdAt: true,
          shipmentId: true,
        },
        orderBy: { createdAt: "desc" },
      },
      courierPayoutRequests: {
        select: {
          id: true,
          amountMinor: true,
          status: true,
          requestedAt: true,
        },
        orderBy: { requestedAt: "desc" },
      },
      shipments: {
        where: { type: "INBOUND_COURIER_PICKUP" },
        select: {
          id: true,
          shipmentStatus: true,
          status: true,
          region: true,
          createdAt: true,
          claimedAt: true,
          deliveredAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          shipments: { where: { type: "INBOUND_COURIER_PICKUP" } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const ids = couriers.map((c) => c.id);
  if (ids.length === 0) {
    return couriers.map((c) => ({ ...c, completedInboundJobs: 0 }));
  }

  const completedByCourier = await prisma.shipment.groupBy({
    by: ["courierId"],
    where: {
      type: "INBOUND_COURIER_PICKUP",
      shipmentStatus: "DELIVERED_TO_WAREHOUSE",
      courierId: { in: ids },
    },
    _count: { _all: true },
  });

  const completedMap = new Map(
    completedByCourier.map((r) => [r.courierId!, r._count._all]),
  );

  return couriers.map((c) => ({
    ...c,
    completedInboundJobs: completedMap.get(c.id) ?? 0,
  }));
}

export async function getCourierPayoutRequests() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.courierPayoutRequest.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      requestedAt: true,
      courier: {
        select: {
          id: true,
          fullName: true,
          email: true,
          region: true,
          courierBankDetails: {
            select: {
              bankName: true,
              accountName: true,
              accountNumber: true,
              accountType: true,
            },
          },
          courierLedger: {
            select: {
              id: true,
              amountMinor: true,
              entryType: true,
              description: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { requestedAt: "asc" },
  });
}

export async function approveCourierPayout(
  payoutId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const request = await prisma.courierPayoutRequest.findUnique({
    where: { id: payoutId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      courierId: true,
      courier: {
        select: {
          courierBankDetails: { select: { bankName: true, accountNumber: true } },
          courierLedger: { select: { amountMinor: true, entryType: true } },
        },
      },
    },
  });

  if (!request) return { ok: false, error: "not_found" };
  if (request.status !== "PENDING") return { ok: false, error: "already_processed" };
  if (!request.courier.courierBankDetails) {
    return { ok: false, error: "no_bank_details" };
  }

  const earnings = request.courier.courierLedger
    .filter((e) => e.entryType === "PICKUP_EARNING")
    .reduce((s, e) => s + e.amountMinor, 0);
  const paid = request.courier.courierLedger
    .filter((e) => e.entryType === "PAYOUT")
    .reduce((s, e) => s + e.amountMinor, 0);
  const available = earnings - paid;

  if (available < request.amountMinor) {
    return { ok: false, error: "insufficient_balance" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.courierPayoutRequest.update({
      where: { id: payoutId },
      data: { status: "APPROVED" },
    });

    await tx.courierLedgerEntry.create({
      data: {
        courierId: request.courierId,
        amountMinor: request.amountMinor,
        currency: "TTD",
        entryType: "PAYOUT",
        description: `Payout approved — ${request.courier.courierBankDetails!.bankName} ****${request.courier.courierBankDetails!.accountNumber.slice(-4)}`,
      },
    });
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/admin");
  return { ok: true };
}

export async function rejectCourierPayout(
  payoutId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const request = await prisma.courierPayoutRequest.findUnique({
    where: { id: payoutId },
    select: { id: true, status: true },
  });

  if (!request) return { ok: false, error: "not_found" };
  if (request.status !== "PENDING") return { ok: false, error: "already_processed" };

  await prisma.courierPayoutRequest.update({
    where: { id: payoutId },
    data: { status: "CANCELLED", notes: reason.trim() || null },
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/admin");
  return { ok: true };
}
