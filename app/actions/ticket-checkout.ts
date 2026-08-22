"use server";

import { randomUUID } from "crypto";

import { NotificationType, Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { ticketConfirmationEmail } from "@/lib/email/templates";
import { createNotification } from "@/app/actions/notifications";
import {
  assertAvailableSeatsForCheckout,
  InsufficientSeatsError,
} from "@/lib/tickets/sold-counts";
import { isStoreSellable } from "@/lib/store/sellable-store";

export type CreateTicketPaymentIntentResult =
  | { ok: true; clientSecret: string; ticketOrderId: string; free: false }
  | { ok: true; clientSecret: null; ticketOrderId: string; free: true }
  | { ok: false; error: string; reason?: string; detail?: string };

type PromoRedeemRow = {
  active: boolean;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
};

const PROMO_RESERVATION_MINUTES = 30;

function isPromoCodeRedeemable(
  row: PromoRedeemRow,
  now: Date,
  reservedCount = 0,
): boolean {
  if (!row.active) return false;
  if (row.expiresAt != null && row.expiresAt <= now) return false;
  if (row.maxUses != null && row.usedCount + reservedCount >= row.maxUses) return false;
  return true;
}

async function cancelExpiredPromoReservations(eventId: string, now: Date): Promise<void> {
  const expired = await prisma.ticketOrder.findMany({
    where: {
      eventId,
      status: "PENDING_PAYMENT",
      promoCodeId: { not: null },
      promoReservationExpiresAt: { lte: now },
    },
    select: { id: true, stripePaymentIntentId: true },
  });

  for (const order of expired) {
    if (order.stripePaymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (intent.status === "succeeded") continue;
        if (intent.status !== "canceled") {
          await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
        }
      } catch (error) {
        console.error("[ticket-checkout] expired promo reservation cleanup", error);
        continue;
      }
    }

    await prisma.ticketOrder.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", promoReservationExpiresAt: null },
    });
  }
}

function computePromoDiscountMinor(
  subtotalMinor: number,
  discountType: string,
  discountValue: number,
): number {
  if (subtotalMinor <= 0) return 0;

  const discount =
    discountType === "PERCENT"
      ? Math.round((subtotalMinor * discountValue) / 100)
      : discountValue;

  return Math.min(Math.max(0, discount), subtotalMinor);
}

class PromoInvalidError extends Error {
  constructor() {
    super("promo_invalid");
    this.name = "PromoInvalidError";
  }
}

function insufficientSeatsResult(err: InsufficientSeatsError): CreateTicketPaymentIntentResult {
  const error =
    err.available <= 0
      ? `Sorry, ${err.ticketTypeName} is sold out.`
      : `Sorry, only ${err.available} ${err.ticketTypeName} left.`;
  return {
    ok: false,
    reason: err.reason,
    detail: err.detail,
    error,
  };
}

/** Largest-remainder split so per-ticket pricePaidMinor sums exactly to orderTotalMinor. */
function distributePricePaidMinor(
  unitMinors: number[],
  discountMinor: number,
): number[] {
  const subtotalMinor = unitMinors.reduce((sum, unit) => sum + unit, 0);
  if (unitMinors.length === 0) return [];
  if (discountMinor <= 0 || subtotalMinor <= 0) {
    return [...unitMinors];
  }

  const allocations = unitMinors.map((unitMinor, index) => {
    const exactShare = (discountMinor * unitMinor) / subtotalMinor;
    const base = Math.floor(exactShare);
    return { index, base, remainder: exactShare - base };
  });

  const pricePaidMinors = unitMinors.map((unitMinor, index) => {
    const allocation = allocations[index];
    return unitMinor - allocation.base;
  });

  let leftover = discountMinor - allocations.reduce((sum, row) => sum + row.base, 0);
  const byRemainder = [...allocations].sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; leftover > 0 && i < byRemainder.length; i++) {
    pricePaidMinors[byRemainder[i].index] -= 1;
    leftover -= 1;
  }

  return pricePaidMinors.map((value) => Math.max(0, value));
}

export async function createTicketPaymentIntent(
  eventId: string,
  items: { ticketTypeId: string; quantity: number }[],
  promoCode?: string,
): Promise<CreateTicketPaymentIntentResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please log in to purchase tickets." };

  if (!eventId) return { ok: false, error: "Event ID is required." };
  if (!items || items.length === 0) return { ok: false, error: "No tickets selected." };
  if (
    items.some(
      (item) =>
        !item.ticketTypeId?.trim() ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0,
    )
  ) {
    return { ok: false, error: "Invalid ticket quantity." };
  }

  // Never trust client line structure. Duplicate ticket-type rows could otherwise
  // bypass max-per-order checks and make each row pass the same availability test.
  const quantityByTicketType = new Map<string, number>();
  for (const item of items) {
    const ticketTypeId = item.ticketTypeId.trim();
    const combined = (quantityByTicketType.get(ticketTypeId) ?? 0) + item.quantity;
    if (!Number.isSafeInteger(combined)) {
      return { ok: false, error: "Invalid ticket quantity." };
    }
    quantityByTicketType.set(ticketTypeId, combined);
  }
  const normalizedItems = Array.from(quantityByTicketType, ([ticketTypeId, quantity]) => ({
    ticketTypeId,
    quantity,
  }));

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      isPublished: true,
      status: true,
      store: {
        select: {
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
    },
  });
  if (!event) return { ok: false, error: "Event not found." };
  if (!event.isPublished || event.status !== "PUBLISHED") {
    return { ok: false, error: "This event is not available for ticket purchase." };
  }
  if (!isStoreSellable(event.store)) {
    return { ok: false, error: "This event is not available for ticket purchase." };
  }

  const buyer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!buyer) return { ok: false, error: "User not found." };

  const now = new Date();

  type ValidatedItem = {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitMinor: number;
  };
  const validatedItems: ValidatedItem[] = [];

  for (const item of normalizedItems) {
    const tt = await prisma.eventTicketType.findUnique({
      where: { id: item.ticketTypeId },
      select: {
        id: true,
        eventId: true,
        name: true,
        price: true,
        quantity: true,
        isVisible: true,
        saleStartDate: true,
        saleEnds: true,
        maxPerOrder: true,
      },
    });

    if (!tt) return { ok: false, error: "Ticket type not found." };
    if (tt.eventId !== eventId) {
      return { ok: false, error: "Ticket type does not belong to this event." };
    }
    if (!tt.isVisible) {
      return { ok: false, error: `"${tt.name}" tickets are not available.` };
    }
    if (tt.saleStartDate && new Date(tt.saleStartDate) > now) {
      return { ok: false, error: `"${tt.name}" tickets are not on sale yet.` };
    }
    if (tt.saleEnds && new Date(tt.saleEnds) < now) {
      return { ok: false, error: `"${tt.name}" ticket sales have ended.` };
    }
    if (item.quantity > tt.maxPerOrder) {
      return {
        ok: false,
        error: `Maximum ${tt.maxPerOrder} "${tt.name}" tickets per order.`,
      };
    }

    const unitMinor = Math.round(tt.price * 100);
    validatedItems.push({
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      quantity: item.quantity,
      unitMinor,
    });
  }

  try {
    await assertAvailableSeatsForCheckout(validatedItems);
  } catch (e) {
    if (e instanceof InsufficientSeatsError) return insufficientSeatsResult(e);
    throw e;
  }

  const orderCount = await prisma.ticketOrder.count();
  const reference = `TKT-${String(orderCount + 1).padStart(4, "0")}`;
  const normalizedPromoCode = promoCode?.trim().toUpperCase() || null;

  if (normalizedPromoCode) {
    await cancelExpiredPromoReservations(eventId, now);
  }

  const txOptions = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  } as const;

  let order;
  let orderTotalMinor = 0;
  let subtotalMinor = 0;
  let ticketCount = 0;
  let isFree = false;

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      await assertAvailableSeatsForCheckout(validatedItems, tx);

      subtotalMinor = validatedItems.reduce(
        (sum, item) => sum + item.unitMinor * item.quantity,
        0,
      );

      let discountMinor = 0;
      let promoId: string | null = null;

      if (normalizedPromoCode) {
        const promo = await tx.eventPromoCode.findUnique({
          where: { eventId_code: { eventId, code: normalizedPromoCode } },
          select: {
            id: true,
            discountType: true,
            discountValue: true,
            active: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true,
          },
        });

        const reservedCount = promo
          ? await tx.ticketOrder.count({
              where: { promoCodeId: promo.id, status: "PENDING_PAYMENT" },
            })
          : 0;

        if (!promo || !isPromoCodeRedeemable(promo, now, reservedCount)) {
          throw new PromoInvalidError();
        }

        promoId = promo.id;
        discountMinor = computePromoDiscountMinor(
          subtotalMinor,
          promo.discountType,
          promo.discountValue,
        );
      }

      orderTotalMinor = subtotalMinor - discountMinor;

      const unitMinorsFlat = validatedItems.flatMap((item) =>
        Array.from({ length: item.quantity }, () => item.unitMinor),
      );
      const pricePaidMinors = distributePricePaidMinor(unitMinorsFlat, discountMinor);

      let globalIdx = 0;
      let priceIdx = 0;
      const ticketRows = validatedItems.flatMap((item) =>
        Array.from({ length: item.quantity }, () => {
          globalIdx++;
          const row = {
            ticketNumber: `${reference}-${String(globalIdx).padStart(2, "0")}`,
            qrToken: randomUUID(),
            eventId,
            ticketTypeId: item.ticketTypeId,
            userId: session.userId,
            holderName: buyer.fullName ?? buyer.email,
            holderEmail: buyer.email,
            pricePaidMinor: pricePaidMinors[priceIdx++],
          };
          return row;
        }),
      );

      const freeOrder = orderTotalMinor === 0;
      const promoReservationExpiresAt =
        promoId && !freeOrder
          ? new Date(now.getTime() + PROMO_RESERVATION_MINUTES * 60 * 1000)
          : null;

      const created = await tx.ticketOrder.create({
        data: {
          reference,
          userId: session.userId,
          eventId,
          promoCodeId: promoId,
          promoReservationExpiresAt,
          status: freeOrder ? "PAID" : "PENDING_PAYMENT",
          subtotal: subtotalMinor,
          total: orderTotalMinor,
          tickets: { create: ticketRows },
        },
      });

      if (freeOrder) {
        for (const item of validatedItems) {
          await tx.eventTicketType.update({
            where: { id: item.ticketTypeId },
            data: { quantitySold: { increment: item.quantity } },
          });
        }
      }

      if (promoId && freeOrder) {
        await tx.eventPromoCode.update({
          where: { id: promoId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return {
        order: created,
        orderTotalMinor,
        ticketCount: ticketRows.length,
        free: freeOrder,
      };
    }, txOptions);

    order = txResult.order;
    orderTotalMinor = txResult.orderTotalMinor;
    ticketCount = txResult.ticketCount;
    isFree = txResult.free;
  } catch (e) {
    if (e instanceof PromoInvalidError) {
      return { ok: false, error: "Promo code is no longer valid.", reason: "promo_invalid" };
    }
    if (e instanceof InsufficientSeatsError) return insufficientSeatsResult(e);
    console.error("[ticket-checkout] order create", e);
    return { ok: false, error: "Could not create ticket order. Please try again." };
  }

  if (isFree) {
    void createNotification({
      userId: session.userId,
      type: NotificationType.TICKET_PURCHASED,
      title: `You're registered for ${event.title}`,
      body: `${ticketCount} free ticket${ticketCount !== 1 ? "s" : ""} confirmed.`,
      linkUrl: "/my-tickets",
    });

    const emailData = ticketConfirmationEmail({
      customerName: buyer.fullName ?? buyer.email,
      eventTitle: event.title,
      orderRef: reference,
      ticketCount,
      totalTTD: 0,
      myTicketsUrl: `${BASE_URL}/my-tickets`,
    });
    void sendEmail({ to: buyer.email, ...emailData });

    return { ok: true, clientSecret: null, ticketOrderId: order.id, free: true };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: orderTotalMinor,
      currency: "ttd",
      metadata: {
        ticketOrderId: order.id,
        userId: session.userId,
        eventId,
      },
    });
  } catch (e) {
    console.error("[ticket-checkout] stripe", e);
    await prisma.ticketOrder.delete({ where: { id: order.id } }).catch(() => {});
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    await prisma.ticketOrder.delete({ where: { id: order.id } }).catch(() => {});
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  await prisma.ticketOrder.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return { ok: true, clientSecret, ticketOrderId: order.id, free: false };
}
