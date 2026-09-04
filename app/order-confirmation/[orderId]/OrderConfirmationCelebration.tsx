"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

import { toastOrderPlaced } from "@/lib/feedback/toasts";
import { trackGoogleAnalyticsEvent } from "@/components/analytics/GoogleAnalytics";

type Props = {
  orderId: string;
  orderReference?: string | null;
  totalMinor: number;
  shippingMinor: number;
  items: Array<{ id: string; name: string; priceMinor: number; quantity: number }>;
};

/**
 * Celebration + toast on successful checkout (mounted from order confirmation page).
 */
export default function OrderConfirmationCelebration({ orderId, orderReference, totalMinor, shippingMinor, items }: Props) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const purchaseKey = `linkwe-ga-purchase:${orderId}`;
    let alreadyTracked = false;
    try {
      alreadyTracked = window.sessionStorage.getItem(purchaseKey) === "1";
    } catch {
      // Analytics must not interfere with a successful order confirmation.
    }

    if (!alreadyTracked) {
      trackGoogleAnalyticsEvent("purchase", {
        transaction_id: orderReference ?? orderId,
        currency: "TTD",
        value: totalMinor / 100,
        shipping: shippingMinor / 100,
        items: items.map((item) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.priceMinor / 100,
          quantity: item.quantity,
        })),
      });
      try {
        window.sessionStorage.setItem(purchaseKey, "1");
      } catch {
        // Some privacy modes block session storage; the purchase can still be reported.
      }
    }

    toastOrderPlaced();
    const t = window.setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 70,
        startVelocity: 26,
        origin: { x: 0.5, y: 0.35 },
        colors: ["#D4450A", "#E8820C", "#f5f5f5", "#1c1c1a"],
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [items, orderId, orderReference, shippingMinor, totalMinor]);

  return null;
}
