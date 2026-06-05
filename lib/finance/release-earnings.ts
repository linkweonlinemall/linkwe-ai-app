import type { LedgerEntryType, Prisma } from "@prisma/client";

import {
  calculateEarnings,
  calculateEarningsMinor,
  calculateTicketEarningsMinor,
  ttdToMinor,
} from "@/lib/finance/commission";
import type { CommissionItemType, CommissionPlan } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function createVendorEarningsLedgerPair(
  tx: Tx,
  input: {
    storeId: string;
    ledgerEntryType: LedgerEntryType;
    grossTTD: number;
    itemType: CommissionItemType;
    plan: CommissionPlan;
    bookingId?: string;
    mainOrderId?: string;
    splitOrderId?: string;
    idempotencyKey: string;
    description: string;
    markedByUserId?: string;
  },
) {
  const existing = await tx.vendorLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const { gross, commission, net } = calculateEarnings(
    input.grossTTD,
    input.itemType,
    input.plan,
  );
  const grossMinor = ttdToMinor(gross);
  const commissionMinor = ttdToMinor(commission);
  const netMinor = ttdToMinor(net);
  const now = new Date();

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "CREDIT_ORDER_SETTLEMENT",
      ledgerEntryType: input.ledgerEntryType,
      amountMinor: netMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      bookingId: input.bookingId,
      mainOrderId: input.mainOrderId,
      splitOrderId: input.splitOrderId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "DEBIT_PLATFORM_FEE",
      ledgerEntryType: "PLATFORM_COMMISSION",
      amountMinor: commissionMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      bookingId: input.bookingId,
      mainOrderId: input.mainOrderId,
      splitOrderId: input.splitOrderId,
      idempotencyKey: `${input.idempotencyKey}:fee`,
      description: `Platform commission on ${input.description}`,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });

  return { grossMinor, commissionMinor, netMinor, net };
}

export async function createProductOrderEarningsLedger(
  tx: Tx,
  input: {
    storeId: string;
    splitOrderId: string;
    mainOrderId: string;
    subtotalMinor: number;
    plan: CommissionPlan;
    ledgerEntryType: LedgerEntryType;
    idempotencyKey: string;
    description: string;
    markedByUserId?: string;
  },
) {
  const existing = await tx.vendorLedgerEntry.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return;

  const { grossMinor, commissionMinor, netMinor } = calculateEarningsMinor(
    input.subtotalMinor,
    "product",
    input.plan,
  );
  const now = new Date();

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "CREDIT_ORDER_SETTLEMENT",
      ledgerEntryType: input.ledgerEntryType,
      amountMinor: netMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      splitOrderId: input.splitOrderId,
      splitOrderRef: input.splitOrderId,
      mainOrderId: input.mainOrderId,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "DEBIT_PLATFORM_FEE",
      ledgerEntryType: "PLATFORM_COMMISSION",
      amountMinor: commissionMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      splitOrderId: input.splitOrderId,
      splitOrderRef: input.splitOrderId,
      mainOrderId: input.mainOrderId,
      idempotencyKey: `${input.idempotencyKey}:fee`,
      description: `Platform commission — ${input.description}`,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });
}

export async function createTicketOrderEarningsLedger(
  tx: Tx,
  input: {
    storeId: string;
    ticketOrderId: string;
    grossMinor: number;
    commissionRate: number;
    ledgerEntryType: LedgerEntryType;
    idempotencyKey: string;
    description: string;
    markedByUserId?: string;
  },
) {
  const existing = await tx.vendorLedgerEntry.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return;

  const { grossMinor, commissionMinor, netMinor } = calculateTicketEarningsMinor(
    input.grossMinor,
  );
  const now = new Date();
  const metadata = {
    ticketOrderId: input.ticketOrderId,
    commissionRate: input.commissionRate,
  };

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "CREDIT_ORDER_SETTLEMENT",
      ledgerEntryType: input.ledgerEntryType,
      amountMinor: netMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      idempotencyKey: input.idempotencyKey,
      description: input.description,
      metadata,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });

  await tx.vendorLedgerEntry.create({
    data: {
      storeId: input.storeId,
      currency: "TTD",
      entryType: "DEBIT_PLATFORM_FEE",
      ledgerEntryType: "PLATFORM_COMMISSION",
      amountMinor: commissionMinor,
      grossMinor,
      commissionMinor,
      netMinor,
      idempotencyKey: `${input.idempotencyKey}:fee`,
      description: `Platform commission — ${input.description}`,
      metadata,
      releasedAt: now,
      createdByUserId: input.markedByUserId,
    },
  });
}

/** Sum available vendor balance from ledger (credits − fee/payout debits). */
export async function getVendorAvailableBalanceMinor(storeId: string): Promise<number> {
  const entries = await prisma.vendorLedgerEntry.findMany({
    where: { storeId },
    select: { amountMinor: true, entryType: true },
  });
  const credits = entries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);
  const debits = entries
    .filter((e) => ["DEBIT_PLATFORM_FEE", "DEBIT_PAYOUT"].includes(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);
  return credits - debits;
}
