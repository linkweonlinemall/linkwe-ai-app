import { NotificationType, OnDemandRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { createNotification } from "@/lib/notifications/create";
import { prisma } from "@/lib/prisma";
import { requestWiPayRefund } from "@/lib/wipay/wapi";

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
      earningsReleased: true,
      autoCompleteAt: true,
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
  if (request.status === OnDemandRequestStatus.REFUND_PENDING) {
    return { ok: false, error: "A refund is already being processed" };
  }
  if (request.earningsReleased) {
    return { ok: false, error: "Earnings have already been released for this request" };
  }
  if (
    request.status === OnDemandRequestStatus.CANCELLED ||
    request.status === OnDemandRequestStatus.DECLINED
  ) {
    return { ok: false, error: "This request is already closed" };
  }

  // 2. WiPay refund — must happen before any DB write.
  // Invariant: it must be structurally impossible to reach the DB write
  // with amountPaid > 0 and no successful (or already-refunded) refund.
  let refundedTTD = 0;
  if (request.amountPaid != null && request.amountPaid > 0) {
    const claimed = await prisma.onDemandRequest.updateMany({
      where: {
        id: requestId,
        status: request.status,
        earningsReleased: false,
      },
      data: { status: OnDemandRequestStatus.REFUND_PENDING, autoCompleteAt: null },
    });
    if (claimed.count !== 1) {
      return { ok: false, error: "This request changed. Refresh and try again." };
    }

    const payment = await prisma.paymentAttempt.findFirst({
      where: {
        purpose: "ON_DEMAND_SERVICE",
        targetId: requestId,
        status: { in: ["SUCCEEDED", "REFUND_REQUESTED", "REFUNDED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!payment?.providerTransactionId) {
      await prisma.onDemandRequest.updateMany({
        where: { id: requestId, status: OnDemandRequestStatus.REFUND_PENDING },
        data: { status: request.status, autoCompleteAt: request.autoCompleteAt },
      });
      return {
        ok: false,
        error: "Could not locate the payment to refund. Nothing was changed.",
      };
    }
    if (payment.status === "REFUND_REQUESTED" || payment.status === "REFUNDED") {
      refundedTTD = request.amountPaid;
    } else {
      try {
        await requestWiPayRefund(payment.providerTransactionId);
        await prisma.paymentAttempt.update({
          where: { id: payment.id },
          data: { status: "REFUND_REQUESTED" },
        });
        refundedTTD = request.amountPaid;
      } catch (err) {
        console.error("[cancelOnDemandCore] WiPay refund failed", err);
        await prisma.onDemandRequest.updateMany({
          where: { id: requestId, status: OnDemandRequestStatus.REFUND_PENDING },
          data: { status: request.status, autoCompleteAt: request.autoCompleteAt },
        });
        return { ok: false, error: "Refund failed. Please try again." };
      }
    }
    // refundedTTD > 0 is now guaranteed before falling through.
  }

  // 3. DB write
  const closed = await prisma.onDemandRequest.updateMany({
    where: {
      id: requestId,
      status:
        refundedTTD > 0
          ? OnDemandRequestStatus.REFUND_PENDING
          : request.status,
      earningsReleased: false,
    },
    data: {
      status: newStatus,
      autoCompleteAt: null,
      ...(newStatus === "DECLINED" && declineReason != null
        ? { declineReason, respondedAt: new Date() }
        : {}),
    },
  });
  if (closed.count !== 1) {
    return { ok: false, error: "This request changed. Contact support for review." };
  }

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
