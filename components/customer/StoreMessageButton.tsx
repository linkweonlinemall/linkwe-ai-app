"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getOrCreateConversation } from "@/app/actions/messages";
import styles from "./customer.module.css";
export default function StoreMessageButton({ storeId }: { storeId: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  return <div><button type="button" disabled={pending} className={styles.secondary} onClick={() => startTransition(async () => {
    setError(""); try { const result = await getOrCreateConversation(storeId); if (result.ok) router.push(`/messages/${result.conversationId}`); else setError(result.error); } catch { setError("Couldn’t open your conversation. Please try again."); }
  })}><MessageCircle size={16} />{pending ? "Opening…" : "Message store"}</button>{error && <p role="alert" className={styles.issue}>{error}</p>}</div>;
}
