"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getAdminVendors() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.store.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      region: true,
      status: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          bankDetails: {
            select: {
              bankName: true,
              accountName: true,
              accountNumber: true,
              accountType: true,
            },
          },
        },
      },
      ledgerEntries: {
        select: {
          id: true,
          amountMinor: true,
          entryType: true,
          ledgerEntryType: true,
          createdAt: true,
          description: true,
        },
        orderBy: { createdAt: "desc" },
      },
      payoutRequests: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          requestedAt: true,
          processedAt: true,
        },
        orderBy: { requestedAt: "desc" },
        take: 25,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPayoutHistory() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.payoutRequest.findMany({
    where: {
      status: { in: ["APPROVED", "CANCELLED"] },
    },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      requestedAt: true,
      processedAt: true,
      failureReason: true,
      store: {
        select: { name: true, region: true },
      },
    },
    orderBy: { processedAt: "desc" },
    take: 100,
  });
}

export async function getAdminPayoutRequests() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  return prisma.payoutRequest.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      status: true,
      requestedAt: true,
      store: {
        select: {
          name: true,
          region: true,
          owner: {
            select: {
              bankDetails: {
                select: {
                  bankName: true,
                  accountName: true,
                  accountNumber: true,
                  accountType: true,
                },
              },
            },
          },
          ledgerEntries: {
            select: {
              id: true,
              amountMinor: true,
              entryType: true,
              ledgerEntryType: true,
              createdAt: true,
              description: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      },
    },
    orderBy: { requestedAt: "asc" },
  });
}

export async function approvePayoutRequest(
  payoutRequestId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  const request = await prisma.payoutRequest.findUnique({
    where: { id: payoutRequestId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      storeId: true,
      store: {
        select: {
          owner: {
            select: {
              bankDetails: {
                select: { bankName: true, accountNumber: true },
              },
            },
          },
        },
      },
    },
  });

  if (!request) return { ok: false, error: "not_found" };
  if (request.status !== "PENDING") return { ok: false, error: "already_processed" };
  if (!request.store.owner.bankDetails) return { ok: false, error: "no_bank_details" };

  const bank = request.store.owner.bankDetails;

  const creditEntries = await prisma.vendorLedgerEntry.findMany({
    where: {
      storeId: request.storeId,
      entryType: "CREDIT_ORDER_SETTLEMENT",
    },
    select: { amountMinor: true },
  });

  const debitEntries = await prisma.vendorLedgerEntry.findMany({
    where: {
      storeId: request.storeId,
      entryType: { in: ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"] },
    },
    select: { amountMinor: true },
  });

  const totalCredits = creditEntries.reduce((s, e) => s + e.amountMinor, 0);
  const totalDebits = debitEntries.reduce((s, e) => s + e.amountMinor, 0);
  const availableBalance = totalCredits - totalDebits;

  if (availableBalance < request.amountMinor) {
    return { ok: false, error: "insufficient_balance" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: "APPROVED",
        processedAt: new Date(),
      },
    });

    await tx.vendorLedgerEntry.create({
      data: {
        storeId: request.storeId,
        currency: "TTD",
        entryType: "DEBIT_PAYOUT",
        ledgerEntryType: "PAYOUT",
        amountMinor: request.amountMinor,
        payoutRequestId,
        description: `Payout approved — ${bank.bankName} ${bank.accountNumber.slice(-4)}`,
      },
    });
  });

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

export async function rejectPayoutRequest(payoutRequestId: string, reason: string): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");

  await prisma.payoutRequest.update({
    where: { id: payoutRequestId },
    data: {
      status: "CANCELLED",
      failureReason: reason,
    },
  });

  revalidatePath("/dashboard/admin");
}
