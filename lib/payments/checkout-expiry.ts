import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { releaseBookingPaymentHoldTx } from "@/lib/payments/release-booking-hold";

export const CHECKOUT_HOLD_MINUTES = 30;

export function checkoutExpiresAt(from = new Date()) {
  return new Date(from.getTime() + CHECKOUT_HOLD_MINUTES * 60 * 1_000);
}

export async function expireCheckoutAttempt(attemptId: string, now = new Date()) {
  return prisma.$transaction(
    async (tx) => {
      const candidate = await tx.paymentAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, purpose: true, targetId: true, status: true, expiresAt: true },
      });
      if (
        !candidate ||
        candidate.status !== "PENDING" ||
        !candidate.expiresAt ||
        candidate.expiresAt > now
      ) {
        return { expired: false, released: false };
      }

      const expired = await tx.paymentAttempt.updateMany({
        where: {
          id: candidate.id,
          status: "PENDING",
          expiresAt: { lte: now },
        },
        data: {
          status: "EXPIRED",
          activeKey: null,
          failureMessage: "Checkout expired before payment confirmation",
        },
      });
      if (expired.count !== 1) return { expired: false, released: false };

      const released =
        candidate.purpose === "PRODUCT_BOOKING"
          ? await releaseBookingPaymentHoldTx(
              tx,
              candidate.targetId,
              "Checkout expired before payment was completed.",
            )
          : false;
      return { expired: true, released };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function expireCheckoutHolds(now = new Date()) {
  const candidates = await prisma.paymentAttempt.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: now },
      purpose: { in: ["PRODUCT_BOOKING", "ON_DEMAND_SERVICE"] },
    },
    select: { id: true, purpose: true, targetId: true },
    orderBy: { expiresAt: "asc" },
    take: 250,
  });

  let attemptsExpired = 0;
  let bookingSlotsReleased = 0;

  for (const candidate of candidates) {
    const result = await expireCheckoutAttempt(candidate.id, now);

    if (result.expired) attemptsExpired++;
    if (result.released) bookingSlotsReleased++;
  }

  return { attemptsExpired, bookingSlotsReleased };
}
