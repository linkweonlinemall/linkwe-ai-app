"use client";

import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

import { toastOrderPlaced } from "@/lib/feedback/toasts";

type Props = {
  orderReference?: string | null;
};

/**
 * Celebration + toast on successful checkout (mounted from order confirmation page).
 */
export default function OrderConfirmationCelebration({ orderReference }: Props) {
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
  }, []);

  void orderReference;
  return null;
}
