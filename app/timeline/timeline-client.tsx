"use client";

import Link from "next/link";
import { Sparkles, Store } from "lucide-react";
import TimelinePostCard, { type TimelinePost } from "@/components/timeline/TimelinePostCard";

export default function TimelineClient({ posts }: { posts: TimelinePost[] }) {
  if (!posts.length) return <main className="min-h-[72vh] bg-[radial-gradient(circle_at_top,rgba(242,138,45,.18),transparent_35%),#F7F5F2] px-4 py-20 text-center"><span className="mx-auto flex size-20 items-center justify-center rounded-[28px] bg-white text-[#D4450A] shadow-xl shadow-orange-100"><Store /></span><h1 className="mt-6 text-3xl font-black text-zinc-950">Your timeline is ready</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">Follow stores you care about and their newest offers, arrivals, events and updates will appear here.</p><Link href="/stores" className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-[#D4450A] px-6 text-sm font-black text-white shadow-lg shadow-orange-200">Find stores to follow</Link></main>;
  return <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(242,138,45,.16),transparent_28%),#F7F5F2] pb-28"><header className="border-b border-white/80 bg-white/75 px-4 py-6 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center justify-between gap-4"><div><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#D4450A]"><Sparkles className="size-3.5" /> From stores you follow</p><h1 className="mt-1 text-2xl font-black text-zinc-950 sm:text-3xl">Timeline</h1></div><Link href="/stores" className="shrink-0 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-xs font-bold text-zinc-800 shadow-sm hover:text-[#D4450A]">Find stores</Link></div></header><div className="mx-auto max-w-2xl space-y-6 px-2.5 py-5 sm:px-4 sm:py-8">{posts.map((post) => <TimelinePostCard key={post.id} initialPost={post} />)}</div></main>;
}
