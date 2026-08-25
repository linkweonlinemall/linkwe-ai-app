"use server";

import type { Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { startSubscriptionCharge } from "@/lib/wipay/subscriptions";
import { verifyTrustedCard } from "@/lib/wipay/wapi";

export async function verifyWiPayCardAndContinue(
  enrollmentId: string,
  amount: number,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please sign in again." };
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10) {
    return { ok: false, error: "Enter the exact verification charge shown by your bank." };
  }

  const enrollment = await prisma.wiPayCardEnrollment.findFirst({
    where: { id: enrollmentId, userId: session.userId, completedAt: { not: null } },
  });
  if (!enrollment?.providerTransactionId) {
    return { ok: false, error: "Card enrollment was not found." };
  }
  const card = await prisma.wiPayTrustedCard.findUnique({
    where: { enrollmentTransactionId: enrollment.providerTransactionId },
  });
  if (!card) return { ok: false, error: "Card enrollment was not found." };

  if (card.status !== "VERIFIED") {
    try {
      await verifyTrustedCard(card.providerUuid, amount);
      await prisma.wiPayTrustedCard.update({
        where: { id: card.id },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });
    } catch (error) {
      console.error("[wipay-card] verification failed", error);
      return { ok: false, error: "That amount did not verify the card. Check your bank statement and try again." };
    }
  }

  const metadata = (enrollment.metadata ?? {}) as { replaceOnly?: boolean } & Prisma.InputJsonObject;
  if (enrollment.purpose === "VENDOR_SUBSCRIPTION" && metadata.replaceOnly === true) {
    await prisma.store.update({
      where: { id: enrollment.targetId },
      data: { wipayTrustedCardId: card.id },
    });
    return { ok: true, checkoutUrl: "/dashboard/vendor/finance?card=updated" };
  }

  const purpose = enrollment.purpose;
  if (purpose !== "VENDOR_SUBSCRIPTION" && purpose !== "SERVICE_SUBSCRIPTION") {
    return { ok: false, error: "Invalid subscription request." };
  }
  try {
    const checkoutUrl = await startSubscriptionCharge(
      {
        userId: enrollment.userId,
        purpose,
        targetId: enrollment.targetId,
        amountMinor: enrollment.amountMinor,
        metadata: metadata as Prisma.InputJsonValue,
      },
      card.id,
      card.providerUuid,
    );
    return { ok: true, checkoutUrl };
  } catch (error) {
    console.error("[wipay-card] initial charge failed", error);
    return { ok: false, error: "Card verified, but the subscription payment could not start." };
  }
}
