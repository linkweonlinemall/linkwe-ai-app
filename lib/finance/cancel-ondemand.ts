import { NotificationType, OnDemandRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createNotification } from "@/app/actions/notifications";
import { ttdToMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export async function cancelOnDemandCore(
  requestId: string,
  newStatus: "CANCELLED" | "DECLINED",
  declineReason?: string | null,
): Promise<
  | { ok: true; refundedTTD: number }
  | { ok: false; error: string }
> {
  // 1. Load request
  const request = await prisma.onDemandRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      amountPaid: true,
      stripePaymentIntentId: true,
      customerId: true,
      store: {
        select: { id: true, ownerId: true },
      },
    },
  });

  if (!request) return { ok: false, error: "Request not found" };
  if (request.status === OnDemandRequestStatus.COMPLETED) {
    return { ok: false, error: "This request is already completed and cannot be refunded" };
  }
  if (
    request.status === OnDemandRequestStatus.CANCELLED ||
    request.status === OnDemandRequestStatus.DECLINED
  ) {
    return { ok: false, error: "This request is already closed" };
  }

  // 2. Stripe refund — must happen before any DB write.
  // Invariant: it must be structurally impossible to reach the DB write
  // with amountPaid > 0 and no successful (or already-refunded) refund.
  let refundedTTD = 0;
  if (request.amountPaid != null && request.amountPaid > 0) {
    // Resolve the PaymentIntent id: stored column first, then metadata search.
    let paymentIntentId = request.stripePaymentIntentId ?? null;

    if (!paymentIntentId) {
      let intents;
      try {
        intents = await stripe.paymentIntents.search({
          query: `metadata['requestId']:'${requestId}'`,
          limit: 1,
        });
      } catch (err) {
        console.error("[cancelOnDemandCore] PaymentIntent search failed", err);
        return {
          ok: false,
          error: "Could not locate the payment to refund. Nothing was changed.",
        };
      }
      paymentIntentId = intents.data[0]?.id ?? null;
    }

    // No PaymentIntent found — refuse to cancel without refunding.
    if (!paymentIntentId) {
      return {
        ok: false,
        error: "Could not locate the payment to refund. Nothing was changed.",
      };
    }

    // Attempt the refund. charge_already_refunded is treated as success.
    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: ttdToMinor(request.amountPaid),
      });
      refundedTTD = request.amountPaid;
    } catch (err: unknown) {
      const stripeErr = err as { code?: string };
      if (stripeErr?.code === "charge_already_refunded") {
        refundedTTD = request.amountPaid;
      } else {
        console.error("[cancelOnDemandCore] Stripe refund failed", err);
        return { ok: false, error: "Refund failed. Please try again." };
      }
    }
    // refundedTTD > 0 is now guaranteed before falling through.
  }

  // 3. DB write
  await prisma.onDemandRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      ...(newStatus === "DECLINED" && declineReason != null
        ? { declineReason, respondedAt: new Date() }
        : {}),
    },
  });

  // 4. Notifications (outside the write — no network calls inside a transaction)
  await createNotification({
    userId: request.customerId,
    type:
      newStatus === "DECLINED"
        ? NotificationType.ON_DEMAND_REQUEST_DECLINED
        : NotificationType.GENERAL,
    title: newStatus === "DECLINED" ? "Request declined" : "Request cancelled",
    body:
      refundedTTD > 0
        ? `TTD ${refundedTTD.toFixed(2)} has been refunded to your card.`
        : "Your request has been closed.",
    linkUrl: "/my-requests",
  });

  if (request.store.ownerId) {
    await createNotification({
      userId: request.store.ownerId,
      type: NotificationType.GENERAL,
      title: "On-demand request closed",
      body:
        refundedTTD > 0
          ? `TTD ${refundedTTD.toFixed(2)} refunded to customer`
          : "A request was closed",
      linkUrl: "/dashboard/vendor/requests",
    });
  }

  // 5. Cache revalidation (best-effort; must not crash the cancel flow)
  for (const path of ["/my-requests", "/dashboard/vendor/requests"]) {
    try {
      revalidatePath(path);
    } catch {
      // silently ignored
    }
  }

  return { ok: true, refundedTTD };
}
