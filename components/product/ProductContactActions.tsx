"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { getOrCreateConversation } from "@/app/actions/messages";
import ShareActionButton from "@/components/ui/ShareActionButton";

export default function ProductContactActions({ storeId, title, isOwner }: { storeId: string; title: string; isOwner: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function message() { startTransition(async () => { const result = await getOrCreateConversation(storeId); if (result.ok) router.push(`/messages/${result.conversationId}`); else if (result.error.toLowerCase().includes("sign in")) router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); }); }
  return <div className="flex items-center gap-2"><ShareActionButton title={title} className="min-w-0 flex-1" />{!isOwner ? <button type="button" disabled={pending} onClick={message} aria-label={pending ? "Opening messages" : "Message vendor"} title="Message vendor" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-[0_10px_24px_rgba(28,28,26,0.28)] transition hover:-translate-y-0.5 hover:bg-[#D4450A] hover:shadow-[0_12px_28px_rgba(212,69,10,0.28)] disabled:opacity-50"><MessageCircle className="size-[19px]" /></button> : null}</div>;
}
