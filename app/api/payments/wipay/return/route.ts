import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyWiPayResponseHash } from "@/lib/wipay/payments";
import { fulfillWiPayAttempt } from "@/lib/payments/fulfill-wipay-attempt";
import { failWiPayAttempt } from "@/lib/payments/fail-wipay-attempt";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const merchantOrderId = url.searchParams.get("order_id") ?? "";
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const hash = url.searchParams.get("hash") ?? "";
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { merchantOrderId },
  });

  if (!attempt || !transactionId || attempt.providerTransactionId !== transactionId) {
    return NextResponse.redirect(new URL("/checkout?payment=invalid", request.url));
  }

  const hasValidHash = verifyWiPayResponseHash({
    transactionId,
    originalAmountMinor: attempt.amountMinor,
    receivedHash: hash,
  });
  if (!hasValidHash) {
    return NextResponse.redirect(new URL("/checkout?payment=invalid", request.url));
  }

  if (status !== "success") {
    await failWiPayAttempt(
      attempt.id,
      status === "error" ? "ERROR" : "FAILED",
      url.searchParams.get("message") || "Payment was not approved",
    );
    return NextResponse.redirect(new URL("/checkout?payment=failed", request.url));
  }

  if (attempt.status !== "SUCCEEDED") {
    await fulfillWiPayAttempt(attempt);
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
      },
    });
  }

  const destination = attempt.purpose === "PRODUCT_ORDER"
    ? `/order-confirmation/${attempt.targetId}`
    : attempt.purpose === "AI_TOPUP"
      ? "/dashboard/vendor/finance?topup=success"
      : attempt.purpose === "ON_DEMAND_SERVICE"
        ? `/my-requests?confirmed=${attempt.targetId}`
      : attempt.purpose === "PRODUCT_BOOKING"
        ? `/booking-confirmation?bookingId=${encodeURIComponent(attempt.targetId)}`
      : attempt.purpose === "TICKET_ORDER"
        ? "/my-tickets?payment=success"
      : attempt.purpose === "VENDOR_SUBSCRIPTION"
        ? "/dashboard/vendor/finance?sub=success"
      : attempt.purpose === "SERVICE_SUBSCRIPTION"
        ? "/dashboard/customer/subscriptions?sub=success"
      : "/?payment=success";
  return NextResponse.redirect(new URL(destination, request.url));
}
