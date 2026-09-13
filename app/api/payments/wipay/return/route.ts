import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyWiPayResponseHash } from "@/lib/wipay/payments";
import { failWiPayAttempt } from "@/lib/payments/fail-wipay-attempt";
import { settleVerifiedWiPaySuccess } from "@/lib/payments/settle-wipay-success";
import type { WiPayEnvironment } from "@/lib/wipay/config";

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

  const providerData = attempt.providerData as { environment?: unknown } | null;
  const recordedEnvironment: WiPayEnvironment | undefined =
    providerData?.environment === "sandbox" || providerData?.environment === "live"
      ? providerData.environment
      : undefined;
  const hasValidHash = verifyWiPayResponseHash({
    transactionId,
    originalAmountMinor: attempt.amountMinor,
    receivedHash: hash,
    environment: recordedEnvironment,
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

  const outcome = await settleVerifiedWiPaySuccess(attempt.id);
  if (outcome === "refunded_closed_or_expired") {
    const refundDestination =
      attempt.purpose === "PRODUCT_BOOKING"
        ? "/bookings?payment=refunded"
        : attempt.purpose === "SERVICE_SUBSCRIPTION"
          ? "/dashboard/customer/subscriptions?payment=refunded"
          : attempt.purpose === "VENDOR_SUBSCRIPTION"
            ? "/dashboard/vendor/finance?payment=refunded"
            : "/my-requests?payment=refunded";
    return NextResponse.redirect(new URL(refundDestination, request.url));
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
