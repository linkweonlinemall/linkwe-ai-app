"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelMyBooking } from "@/app/actions/bookings";
import styles from "@/components/customer/customer.module.css";
export default function CancelBookingButton({ bookingId, storeName }: { bookingId: string; storeName: string }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  if (!open) return <button className={styles.quietAction} onClick={() => setOpen(true)}>Cancel booking</button>;
  return <div className={styles.confirm}><strong>Cancel this booking?</strong><p>This cancels your appointment with {storeName}. Any recorded payment will be submitted for refund. You’ll need a new booking if you change your mind.</p>{error && <p className={styles.issue} role="alert">{error}</p>}<div><button className={styles.secondary} disabled={pending} onClick={() => { setError(""); setOpen(false); }}>Keep booking</button><button className={styles.primary} disabled={pending} onClick={() => startTransition(async () => {
    setError(""); try { const result = await cancelMyBooking(bookingId); if (!result.ok) { setError(result.error); return; } toast.success(result.refundedTTD > 0 ? `Booking cancelled. TTD ${result.refundedTTD.toFixed(2)} refund requested.` : "Booking cancelled."); setOpen(false); router.refresh(); } catch { setError("We couldn’t confirm the cancellation. Refresh to check the latest status before trying again."); }
  })}>{pending ? "Cancelling…" : "Yes, cancel booking"}</button></div></div>;
}
