"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { dayRangeTrinidad } from "@/lib/timezone/trinidad";

const EVENTS_PATH = "/dashboard/vendor/events";

const INVALID_PROMO_MESSAGE = "This code isn't valid for this event.";

export type ValidatePromoCodeResult =
  | { ok: false; reason: string }
  | { ok: true; code: string; discountType: string; discountValue: number };

type PromoRedeemRow = {
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
};

function isPromoCodeRedeemable(row: PromoRedeemRow, now = new Date()): boolean {
  if (!row.active) return false;
  if (row.expiresAt != null && row.expiresAt <= now) return false;
  if (row.maxUses != null && row.usedCount >= row.maxUses) return false;
  return true;
}

export async function validatePromoCode(
  eventId: string,
  code: string,
): Promise<ValidatePromoCodeResult> {
  const trimmedId = eventId?.trim();
  const normalized = code?.trim().toUpperCase();
  if (!trimmedId || !normalized) {
    return { ok: false, reason: INVALID_PROMO_MESSAGE };
  }

  const now = new Date();

  const row = await prisma.eventPromoCode.findUnique({
    where: { eventId_code: { eventId: trimmedId, code: normalized } },
    select: {
      code: true,
      discountType: true,
      discountValue: true,
      active: true,
      expiresAt: true,
      maxUses: true,
      usedCount: true,
      _count: {
        select: {
          ticketOrders: {
            where: {
              status: "PENDING_PAYMENT",
              promoReservationExpiresAt: { gt: now },
            },
          },
        },
      },
    },
  });

  if (
    !row ||
    !isPromoCodeRedeemable(
      {
        ...row,
        usedCount: row.usedCount + row._count.ticketOrders,
      },
      now,
    )
  ) {
    return { ok: false, reason: INVALID_PROMO_MESSAGE };
  }

  return {
    ok: true,
    code: row.code,
    discountType: row.discountType,
    discountValue: row.discountValue,
  };
}

export type PromoCodeRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
};

type CreatePromoCodeInput = {
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  expiresAt: string | null;
};

async function assertCanManageEvent(
  eventId: string,
): Promise<{ ok: true; eventId: string } | { ok: false; reason: string }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const trimmedId = eventId?.trim();
  if (!trimmedId) return { ok: false, reason: "Event not found" };

  if (session.role === "ADMIN") {
    const exists = await prisma.event.findUnique({
      where: { id: trimmedId },
      select: { id: true },
    });
    if (!exists) return { ok: false, reason: "Event not found" };
    return { ok: true, eventId: trimmedId };
  }

  const event = await prisma.event.findFirst({
    where: { id: trimmedId, store: { ownerId: session.userId } },
    select: { id: true },
  });

  if (!event) return { ok: false, reason: "Unauthorized" };
  return { ok: true, eventId: trimmedId };
}

function parseExpiresAt(value: string | null | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return dayRangeTrinidad(trimmed).end;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function validateCreateInput(
  input: CreatePromoCodeInput,
): { ok: true; data: CreatePromoCodeInput } | { ok: false; reason: string } {
  const code = input.code?.trim().toUpperCase();
  if (!code) return { ok: false, reason: "Enter a promo code." };

  const discountType = input.discountType?.trim().toUpperCase();
  if (discountType !== "PERCENT" && discountType !== "FIXED") {
    return { ok: false, reason: "Discount type must be percent or fixed amount." };
  }

  const discountValue = Math.trunc(input.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, reason: "Discount value must be greater than zero." };
  }

  if (discountType === "PERCENT" && (discountValue < 1 || discountValue > 100)) {
    return { ok: false, reason: "Percent discount must be between 1 and 100." };
  }

  let maxUses: number | null = null;
  if (input.maxUses != null) {
    const n = Math.trunc(input.maxUses);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, reason: "Max uses must be greater than zero, or leave blank for unlimited." };
    }
    maxUses = n;
  }

  const expiresAtRaw = input.expiresAt?.trim() || null;
  if (expiresAtRaw && !parseExpiresAt(expiresAtRaw)) {
    return { ok: false, reason: "Expiry date is not valid." };
  }

  return {
    ok: true,
    data: {
      code,
      discountType,
      discountValue,
      maxUses,
      expiresAt: expiresAtRaw,
    },
  };
}

function mapPromoRow(row: {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  active: boolean;
}): PromoCodeRow {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType,
    discountValue: row.discountValue,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    active: row.active,
  };
}

export async function createPromoCode(
  eventId: string,
  input: CreatePromoCodeInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const auth = await assertCanManageEvent(eventId);
  if (!auth.ok) return auth;

  const validated = validateCreateInput(input);
  if (!validated.ok) return validated;

  const { code, discountType, discountValue, maxUses, expiresAt } = validated.data;

  try {
    await prisma.eventPromoCode.create({
      data: {
        eventId: auth.eventId,
        code,
        discountType,
        discountValue,
        maxUses,
        expiresAt: parseExpiresAt(expiresAt),
        usedCount: 0,
        active: true,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "A code with that name already exists for this event." };
    }
    console.error("[createPromoCode]", err);
    return { ok: false, reason: "Could not create promo code." };
  }

  revalidatePath(`${EVENTS_PATH}/${auth.eventId}/tickets`);
  return { ok: true };
}

export async function listPromoCodes(
  eventId: string,
): Promise<{ ok: true; codes: PromoCodeRow[] } | { ok: false; reason: string }> {
  const auth = await assertCanManageEvent(eventId);
  if (!auth.ok) return auth;

  const rows = await prisma.eventPromoCode.findMany({
    where: { eventId: auth.eventId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      active: true,
    },
  });

  return { ok: true, codes: rows.map(mapPromoRow) };
}

export async function togglePromoCode(
  promoCodeId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const trimmedId = promoCodeId?.trim();
  if (!trimmedId) return { ok: false, reason: "Promo code not found" };

  const promo = await prisma.eventPromoCode.findUnique({
    where: { id: trimmedId },
    select: {
      eventId: true,
      event: { select: { store: { select: { ownerId: true } } } },
    },
  });

  if (!promo) return { ok: false, reason: "Promo code not found" };

  if (session.role !== "ADMIN" && promo.event.store.ownerId !== session.userId) {
    return { ok: false, reason: "Unauthorized" };
  }

  await prisma.eventPromoCode.update({
    where: { id: trimmedId },
    data: { active },
  });

  revalidatePath(`${EVENTS_PATH}/${promo.eventId}/tickets`);
  return { ok: true };
}
