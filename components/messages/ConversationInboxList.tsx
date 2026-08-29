"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { formatConversationListTime } from "@/lib/messages/format-time";

export type InboxConversation = {
  id: string;
  name: string;
  imageUrl?: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date;
  unread: number;
  href: string;
};

function snippet(text: string | null) {
  const value = text?.trim() || "No messages yet";
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}

export default function ConversationInboxList({ conversations }: { conversations: InboxConversation[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "unread" | "read">("all");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const now = useMemo(() => new Date(), []);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return conversations
      .filter((row) => status === "all" || (status === "unread" ? row.unread > 0 : row.unread === 0))
      .filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.lastMessageText?.toLowerCase().includes(needle))
      .sort((a, b) => (sort === "recent" ? 1 : -1) * (b.lastMessageAt.getTime() - a.lastMessageAt.getTime()));
  }, [conversations, query, sort, status]);

  return <div data-tour="message-list" className="mt-5 min-w-0">
    <div data-tour="message-filters" className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <label data-tour="message-search" className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names or messages" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none focus:border-[#D4450A] focus:bg-white focus:ring-4 focus:ring-orange-500/10" /></label>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <SlidersHorizontal className="size-4 text-zinc-400" aria-hidden />
        {(["all", "unread", "read"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`min-h-9 rounded-full px-3 text-xs font-semibold capitalize ${status === value ? "bg-[#1C1C1A] text-white" : "bg-zinc-100 text-zinc-600"}`}>{value}</button>)}
        <select value={sort} onChange={(e) => setSort(e.target.value as "recent" | "oldest")} className="ml-auto min-h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600"><option value="recent">Newest first</option><option value="oldest">Oldest first</option></select>
      </div>
    </div>
    {visible.length === 0 ? <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center text-sm text-zinc-500">No conversations match these filters.</div> : <ul className="mt-3 flex min-w-0 flex-col gap-2">{visible.map((row) => <li key={row.id} className="min-w-0"><Link href={row.href} className="flex min-h-[72px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-orange-200 hover:shadow-md"><div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 font-black text-[#D4450A]">{row.imageUrl ? <Image src={row.imageUrl} alt="" fill sizes="48px" className="object-cover" /> : row.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex min-w-0 items-baseline justify-between gap-2"><p className="truncate text-sm font-bold text-zinc-900">{row.name}</p><time className="shrink-0 text-[10px] text-zinc-400">{formatConversationListTime(row.lastMessageAt, now)}</time></div><p className="mt-1 truncate text-xs text-zinc-500">{snippet(row.lastMessageText)}</p></div>{row.unread > 0 ? <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#D4450A] px-1 text-[10px] font-bold text-white">{row.unread > 99 ? "99+" : row.unread}</span> : null}</Link></li>)}</ul>}
  </div>;
}
