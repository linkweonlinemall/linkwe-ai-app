"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LoaderCircle, Search, SlidersHorizontal, Sparkles, Store } from "lucide-react";
import { getTimelineFeed, type TimelineSearchOptions } from "@/app/actions/business-timeline";
import TimelinePostCard, { type TimelinePost } from "@/components/timeline/TimelinePostCard";

type SearchState = { query: string; type: string; scope: "following" | "all"; photos: boolean };

function searchUrl(search: SearchState) {
  const params = new URLSearchParams();
  if (search.query) params.set("q", search.query);
  if (search.type) params.set("type", search.type);
  if (search.scope === "all") params.set("scope", "all");
  if (search.photos) params.set("photos", "1");
  const value = params.toString();
  return `/timeline${value ? `?${value}` : ""}`;
}

export default function TimelineClient({ posts: initialPosts, search: initialSearch }: { posts: TimelinePost[]; search: SearchState }) {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState(initialSearch);
  const [pending, startTransition] = useTransition();
  const searching = Boolean(search.query || search.type || search.photos || search.scope === "all");

  const runSearch = (next: SearchState) => startTransition(async () => {
    const data = await getTimelineFeed(next satisfies TimelineSearchOptions);
    setPosts(data.posts as unknown as TimelinePost[]);
    setSearch(next);
    window.history.replaceState(null, "", searchUrl(next));
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_8%,rgba(251,146,60,.20),transparent_27%),radial-gradient(circle_at_90%_35%,rgba(244,63,94,.09),transparent_26%),linear-gradient(180deg,#fffaf5_0%,#f7f5f2_42%,#fff7ed_100%)] pb-28">
      <header className="border-b border-orange-100/80 bg-gradient-to-br from-white/95 via-orange-50/80 to-rose-50/60 px-4 py-6 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-4">
            <div><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#D4450A]"><Sparkles className="size-3.5" /> Shop through posts & ads</p><h1 className="mt-1 text-2xl font-black text-zinc-950 sm:text-3xl">Timeline</h1></div>
            <Link href="/stores" className="shrink-0 rounded-2xl border border-orange-100 bg-white px-4 py-3 text-xs font-bold text-zinc-800 shadow-[0_8px_24px_rgba(212,69,10,.10)] hover:text-[#D4450A]">Find stores</Link>
          </div>
          <form key={searchUrl(search)} onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            runSearch({ query: String(data.get("q") ?? "").trim().slice(0, 120), type: String(data.get("type") ?? ""), scope: data.get("scope") === "all" ? "all" : "following", photos: data.get("photos") === "1" });
          }} className="mt-5 rounded-[22px] border border-orange-100 bg-white/95 p-3 shadow-[0_14px_40px_rgba(103,55,24,.10)]">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input name="q" defaultValue={search.query} placeholder="Search products, offers, events or stores…" className="min-h-11 w-full rounded-xl bg-gradient-to-r from-zinc-100 to-orange-50/70 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" /></label>
              <button disabled={pending} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4450A] to-[#F28A2D] px-4 text-xs font-black text-white shadow-md shadow-orange-200 disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}<span className="hidden sm:inline">{pending ? "Searching" : "Search"}</span></button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-400"><SlidersHorizontal className="size-3.5" /> Filters</span>
              <select name="scope" defaultValue={search.scope} className="min-h-9 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold"><option value="following">Stores I follow</option><option value="all">Explore all posts</option></select>
              <select name="type" defaultValue={search.type} className="min-h-9 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold"><option value="">Everything</option><option value="PRODUCT">Products</option><option value="SERVICE">Services</option><option value="EVENT">Events</option><option value="STORE">Stores</option><option value="TICKET">Tickets</option></select>
              <label className="inline-flex min-h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-semibold"><input type="checkbox" name="photos" value="1" defaultChecked={search.photos} className="accent-[#D4450A]" /> Photos only</label>
              {searching ? <button type="button" onClick={() => runSearch({ query: "", type: "", scope: "following", photos: false })} className="px-2 text-xs font-bold text-[#D4450A]">Clear</button> : null}
            </div>
          </form>
        </div>
      </header>
      <div aria-live="polite" className={pending ? "opacity-55 transition-opacity" : "transition-opacity"}>
        {posts.length ? (
          <div className="mx-auto max-w-2xl space-y-6 px-2.5 py-5 sm:px-4 sm:py-8">{posts.map((post) => <TimelinePostCard key={post.id} initialPost={post} />)}</div>
        ) : (
          <div className="mx-auto max-w-xl px-4 py-16 text-center"><span className="mx-auto flex size-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-white to-orange-100 text-[#D4450A] shadow-xl shadow-orange-100"><Store /></span><h2 className="mt-6 text-2xl font-black text-zinc-950">{searching ? "No matching posts yet" : "Your timeline is ready"}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">{searching ? "Try a broader search or explore posts from every store." : "Follow stores you care about and their newest offers, arrivals, events and updates will appear here."}</p><Link href={searching ? "/timeline?scope=all" : "/stores"} className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-gradient-to-r from-[#D4450A] to-[#F28A2D] px-6 text-sm font-black text-white shadow-lg shadow-orange-200">{searching ? "Explore all posts" : "Find stores to follow"}</Link></div>
        )}
      </div>
    </main>
  );
}
