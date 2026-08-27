"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { getOrCreateConversation } from "@/app/actions/messages";
import ShareActionButton from "@/components/ui/ShareActionButton";

export default function ProductContactActions({ storeId, title, isOwner }: { storeId: string; title: string; isOwner: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function message() { startTransition(async () => { const result = await getOrCreateConversation(storeId); if (result.ok) router.push(`/messages/${result.conversationId}`); else if (result.error.toLowerCase().includes("sign in")) router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`); }); }
  return <div className="grid grid-cols-2 gap-2"><ShareActionButton title={title} className="w-full" />{!isOwner ? <button type="button" disabled={pending} onClick={message} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white transition hover:bg-[#D4450A] disabled:opacity-50"><MessageCircle className="size-4" />{pending ? "Opening…" : "Message vendor"}</button> : null}</div>;
}
