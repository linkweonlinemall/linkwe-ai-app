"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { markBookingComplete } from "@/app/actions/bookings";
import styles from "@/components/customer/customer.module.css";
export default function MarkBookingCompleteButton({ bookingId, storeName }: { bookingId: string; storeName: string }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  if (!open) return <button className={styles.primary} onClick={() => setOpen(true)}><CheckCheck size={16} />Mark as complete</button>;
  return <div className={styles.confirm}><strong>All done? Let your store know.</strong><p>Confirm you received this service from {storeName}. This completes the booking and releases payment to the store.</p>{error && <p className={styles.issue} role="alert">{error}</p>}<div><button className={styles.secondary} disabled={pending} onClick={() => { setError(""); setOpen(false); }}>Not yet</button><button className={styles.primary} disabled={pending} onClick={() => startTransition(async () => {
    setError(""); try { const result = await markBookingComplete(bookingId); if ("error" in result) { setError(result.error); return; } setOpen(false); router.refresh(); } catch { setError("We couldn’t confirm completion. Refresh to check the latest status before trying again."); }
  })}>{pending ? "Completing…" : "Confirm & complete"}</button></div></div>;
}
