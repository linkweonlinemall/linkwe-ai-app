"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { confirmBookingPaid } from "@/app/actions/booking";
import InlineSpinner from "@/components/ui/InlineSpinner";

type Props = {
  bookingId?: string;
};

/**
 * After Stripe 3DS redirect, confirms the booking server-side and cleans the URL.
 */
export default function BookingConfirmationClient({ bookingId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const id = bookingId ?? searchParams.get("bookingId");
    const paymentIntentId = searchParams.get("payment_intent");
    const redirectStatus = searchParams.get("redirect_status");

    if (!id || !paymentIntentId || !redirectStatus) return;

    if (redirectStatus !== "succeeded") {
      setIsError(true);
      setMessage("Payment was not completed. Please try again from your booking.");
      return;
    }

    let cancelled = false;

    void (async () => {
      setMessage("Confirming your payment…");
      setIsError(false);

      try {
        const result = await confirmBookingPaid(id, paymentIntentId);
        if (cancelled) return;

        if ("error" in result) {
          setIsError(true);
          setMessage(
            result.error === "Payment has not completed yet"
              ? "Payment is still processing. Refresh this page in a moment."
              : result.error,
          );
          return;
        }

        setMessage(null);
        router.replace(`/booking-confirmation?bookingId=${encodeURIComponent(id)}`);
      } catch {
        if (!cancelled) {
          setIsError(true);
          setMessage("Could not confirm your payment. Please refresh or contact support.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bookingId, searchParams, router]);

  if (!message) return null;

  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-sm ${
        isError ? "bg-red-50 text-red-700" : "bg-zinc-50 text-zinc-600"
      }`}
    >
      {isError ? (
        message
      ) : (
        <span className="inline-flex items-center justify-center gap-2">
          <InlineSpinner className="h-4 w-4 shrink-0" />
          {message}
        </span>
      )}
    </div>
  );
}
