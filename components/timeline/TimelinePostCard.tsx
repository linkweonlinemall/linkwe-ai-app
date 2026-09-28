"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, Heart, Link2, MessageCircle, Send, Store, Tag } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import TimelineMedia from "./TimelineMedia";
import ShareActionButton from "@/components/ui/ShareActionButton";
import { addBusinessPostComment, toggleBusinessPostLike, type TimelineAttachment } from "@/app/actions/business-timeline";

type Person = { fullName: string; role?: string };
type Reply = { id: string; body: string; user: Person };
type Comment = { id: string; body: string; user: Person; replies: Reply[] };

export type TimelinePost = {
  id: string;
  caption: string;
  images: string[];
  searchTags?: string[];
  attachments?: unknown;
  createdAt: string;
  store: { name: string; slug: string; logoUrl: string | null };
  likes: { userId: string }[];
  comments: Comment[];
  _count: { likes: number; comments: number };
};

function parsedAttachments(value: unknown): TimelineAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TimelineAttachment => Boolean(item && typeof item === "object" && "href" in item && "name" in item)).slice(0, 4);
}

function linkifyPlainUrls(value: string): string {
  return value.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|<https?:\/\/[^>]+>)/gi).map((part) =>
    /^\[[^\]]+\]\(|^<https?:\/\//i.test(part) ? part : part.replace(/https?:\/\/[^\s<>()]+/gi, (url) => `<${url}>`),
  ).join("");
}

function AttachmentCards({ value }: { value: unknown }) {
  const items = parsedAttachments(value);
  if (!items.length) return null;
  return <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">{items.map((item) => <Link key={item.key} href={item.href} className="flex min-w-[78%] snap-start items-center gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50/80 to-white p-3 shadow-sm sm:min-w-[280px]"><span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <Store className="size-5 text-[#D4450A]" />}</span><span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-wider text-[#D4450A]">{item.kind.replaceAll("_", " ")}</span><strong className="mt-0.5 block truncate text-sm text-zinc-900">{item.name}</strong><span className="block truncate text-[11px] text-zinc-500">{item.subtitle}</span></span></Link>)}</div>;
}

export default function TimelinePostCard({ initialPost, detail = false, canComment = true }: { initialPost: TimelinePost; detail?: boolean; canComment?: boolean }) {
  const [post, setPost] = useState(initialPost);
  const [replying, setReplying] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const liked = post.likes.length > 0;

  const like = () => {
    const previous = post;
    setPost({ ...post, likes: liked ? [] : [{ userId: "optimistic" }], _count: { ...post._count, likes: Math.max(0, post._count.likes + (liked ? -1 : 1)) } });
    startTransition(async () => {
      const result = await toggleBusinessPostLike(post.id);
      if ("error" in result) { setPost(previous); toast.error(result.error); return; }
      setPost((current) => ({ ...current, likes: result.liked ? [{ userId: "me" }] : [], _count: { ...current._count, likes: result.likeCount } }));
    });
  };

  const comment = (parentId: string | undefined, form: HTMLFormElement) => {
    const body = String(new FormData(form).get("body") ?? "").trim();
    if (!body) return;
    startTransition(async () => {
      const result = await addBusinessPostComment(post.id, body, parentId);
      if ("error" in result) { toast.error(result.error); return; }
      form.reset(); setReplying(null);
      setPost((current) => {
        const nextComments = parentId ? current.comments.map((entry) => entry.id === parentId ? { ...entry, replies: [...entry.replies, result.comment] } : entry) : [...current.comments, result.comment];
        return { ...current, comments: nextComments, _count: { ...current._count, comments: result.commentCount } };
      });
    });
  };

  return <article id={post.id} className="relative min-w-0 w-full rounded-[28px] border border-sky-100 bg-white shadow-[0_10px_35px_rgba(23,71,102,.06)] ring-1 ring-white">
    <div className="flex items-center gap-3 rounded-t-[28px] bg-gradient-to-r from-orange-50/90 via-white to-rose-50/70 p-4 sm:p-5"><Link href={`/store/${post.store.slug}`} className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 shadow-sm">{post.store.logoUrl ? <img src={post.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={20} className="text-[#D4450A]" />}</Link><div className="min-w-0 flex-1"><Link href={`/store/${post.store.slug}`} className="block truncate text-sm font-black text-zinc-950 hover:text-[#D4450A]">{post.store.name}</Link><Link href={`/timeline/${post.id}`} className="text-[11px] text-zinc-400 hover:text-zinc-700"><time>{new Date(post.createdAt).toLocaleDateString("en-TT", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></Link></div><span className="rounded-full bg-gradient-to-r from-orange-100 to-rose-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#D4450A] shadow-sm">Update</span></div>
    <TimelineMedia storeName={post.store.name} images={post.images} detail={detail} />
    <div className="p-4 sm:p-5"><div className="flex items-center gap-1"><button type="button" onClick={like} disabled={pending} className={`rounded-full p-2.5 transition active:scale-90 ${liked ? "bg-rose-50 text-rose-600" : "text-zinc-700 hover:bg-rose-50 hover:text-rose-600"}`} aria-label={liked ? "Unlike" : "Like"}><Heart className="size-5" fill={liked ? "currentColor" : "none"} /></button><button type="button" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()} className="rounded-full p-2.5 text-zinc-700 transition hover:bg-orange-50 hover:text-[#D4450A]" aria-label="Comment"><MessageCircle className="size-5" /></button><ShareActionButton title={post.store.name} text={post.caption} url={`/timeline/${post.id}`} label="" className="!min-h-10 !rounded-full !border-0 !px-2.5 !shadow-none" /><span className="ml-auto text-[11px] font-bold text-zinc-500 sm:text-xs">{post._count.likes} likes · {post._count.comments} comments</span></div>
      {post.caption ? <div className="mt-3 [overflow-wrap:anywhere] text-sm leading-7 text-zinc-700"><Link href={`/store/${post.store.slug}`} className="mr-2 font-black text-zinc-950">{post.store.name}</Link><ReactMarkdown components={{ p: ({ children }) => <span className="whitespace-pre-wrap">{children}</span>, ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>, ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="mx-0.5 my-1 inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-gradient-to-r from-[#D4450A] via-[#F06A2A] to-[#E34D76] px-3 py-1.5 text-[11px] font-black text-white no-underline shadow-[0_6px_16px_rgba(212,69,10,.25)] transition hover:-translate-y-0.5 hover:shadow-lg"><Link2 className="size-3.5 shrink-0" />{children}</a> }}>{linkifyPlainUrls(post.caption)}</ReactMarkdown></div> : null}
      {post.searchTags?.length ? <details className="relative mt-3 w-fit"><summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-orange-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#B83A09] shadow-sm"><Tag className="size-3.5" /> Search tags ({post.searchTags.length}) <ChevronDown className="size-3.5" /></summary><div className="absolute left-0 top-[calc(100%+.4rem)] z-20 flex min-w-52 max-w-[min(82vw,340px)] flex-wrap gap-1.5 rounded-2xl border border-orange-100 bg-white p-3 shadow-[0_16px_45px_rgba(91,49,24,.18)]">{post.searchTags.map((tag) => <Link key={tag} href={`/timeline?scope=all&q=${encodeURIComponent(tag)}`} className="rounded-full bg-gradient-to-r from-orange-50 to-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#B83A09] hover:from-orange-100 hover:to-rose-100">#{tag}</Link>)}</div></details> : null}
      <AttachmentCards value={post.attachments} />
      {post.comments.length ? <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">{post.comments.map((entry) => <div key={entry.id}><p className="break-words [overflow-wrap:anywhere] text-sm text-zinc-700"><strong className="mr-2 text-xs text-zinc-950">{entry.user.fullName}</strong>{entry.user.role === "VENDOR" ? <span className="mr-2 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-[#D4450A]">Vendor</span> : null}{entry.body}</p>{canComment ? <button type="button" className="ml-1 mt-1 text-[11px] font-bold text-zinc-400 hover:text-[#D4450A]" onClick={() => setReplying(entry.id)}>Reply</button> : null}{entry.replies.map((reply) => <p key={reply.id} className="ml-6 mt-2 border-l-2 border-orange-100 pl-3 text-xs text-zinc-600"><strong className="mr-2 text-zinc-900">{reply.user.fullName}</strong>{reply.user.role === "VENDOR" ? <span className="mr-2 text-[8px] font-black uppercase text-[#D4450A]">Vendor</span> : null}{reply.body}</p>)}{replying === entry.id ? <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); comment(entry.id, event.currentTarget); }}><input name="body" required maxLength={800} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-200" /><button disabled={pending} className="rounded-xl px-3 text-[#D4450A]" aria-label="Send reply"><Send size={16} /></button></form> : null}</div>)}</div> : null}
      {canComment ? <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); comment(undefined, event.currentTarget); }}><input id={`comment-${post.id}`} name="body" required maxLength={800} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" /><button disabled={pending} className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#D4450A] text-white shadow-md shadow-orange-200" aria-label="Post comment"><Send size={17} /></button></form> : null}
    </div>
  </article>;
}
