"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

import { toastOrderPlaced } from "@/lib/feedback/toasts";
import { analyticsEnabled, trackGoogleAnalyticsEvent } from "@/components/analytics/GoogleAnalytics";

type Props = {
  trackPurchase?: boolean;
  orderId: string;
  orderReference?: string | null;
  totalMinor: number;
  shippingMinor: number;
  items: Array<{ id: string; name: string; priceMinor: number; quantity: number }>;
};

/**
 * Celebration + toast on successful checkout (mounted from order confirmation page).
 */
export default function OrderConfirmationCelebration({ trackPurchase = false, orderId, orderReference, totalMinor, shippingMinor, items }: Props) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

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

  useEffect(() => {
    if (!trackPurchase) return;
    const key = `linkwe-ga-purchase:${orderId}`;
    let sent = false;
    const send = () => {
      if (sent || !analyticsEnabled()) return;
      try { if (sessionStorage.getItem(key) === "1") return; } catch {}
      trackGoogleAnalyticsEvent("purchase", { transaction_id: orderReference ?? orderId, currency: "TTD", value: totalMinor / 100, shipping: shippingMinor / 100, items: items.map(item => ({ item_id: item.id, price: item.priceMinor / 100, quantity: item.quantity })) });
      sent = true;
      try { sessionStorage.setItem(key, "1"); } catch {}
    };
    send(); window.addEventListener("linkwe:analytics-ready", send);
    return () => window.removeEventListener("linkwe:analytics-ready", send);
  }, [trackPurchase, orderId, orderReference, totalMinor, shippingMinor, items]);
  return null;
}
