"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getOrCreateConversationAsVendor } from "@/app/actions/messages";
import s from "@/components/vendor/orders/orders.module.css";

type Props = { customerId: string; storeId: string };
export function MessageCustomerButton({ customerId, storeId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function handleClick() {
    setLoading(true); setError("");
    try {
      const result = await getOrCreateConversationAsVendor(customerId, storeId);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/dashboard/vendor/messages/${result.conversationId}`);
    } catch { setError("Couldn’t open this conversation. Please try again."); }
    finally { setLoading(false); }
  }
  return <div><button type="button" onClick={handleClick} disabled={loading} className={s.secondary} style={{width:"100%"}}><MessageCircle size={16}/>{loading ? "Opening…" : "Message customer"}</button>{error && <p className={s.error} role="alert">{error}</p>}</div>;
}
