"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Heart, Link2, MessageCircle, Send, Store, Tag, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
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

function PhotoCarousel({ storeName, images, detail = false }: { storeName: string; images: string[]; detail?: boolean }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStart = useRef<number | null>(null);
  const dragRef = useRef(0);
  const didSwipe = useRef(false);
  if (!images.length) return null;
  const move = (next: number) => setIndex(Math.max(0, Math.min(images.length - 1, next)));
  const onTouchStart = (x: number) => { touchStart.current = x; didSwipe.current = false; setDragging(true); };
  const onTouchMove = (x: number) => { if (touchStart.current == null) return; let delta = x - touchStart.current; if ((index === 0 && delta > 0) || (index === images.length - 1 && delta < 0)) delta *= 0.28; dragRef.current = delta; setDragX(delta); if (Math.abs(delta) > 8) didSwipe.current = true; };
  const onTouchEnd = () => { const delta = dragRef.current; if (Math.abs(delta) > 42) move(index + (delta < 0 ? 1 : -1)); dragRef.current = 0; setDragX(0); setDragging(false); touchStart.current = null; };
  const trackStyle = { transform: `translate3d(calc(-${index * 100}% + ${dragX}px),0,0)` };
  const touchHandlers = { onTouchStart: (event: React.TouchEvent) => onTouchStart(event.touches[0]?.clientX ?? 0), onTouchMove: (event: React.TouchEvent) => onTouchMove(event.touches[0]?.clientX ?? 0), onTouchEnd, onTouchCancel: onTouchEnd };
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-orange-950" {...(!lightbox ? touchHandlers : {})}>
      <div className={`flex touch-pan-y will-change-transform ${dragging ? "transition-none" : "transition-transform duration-300 ease-[cubic-bezier(.2,.85,.35,1)]"}`} style={trackStyle}>{images.map((src, photoIndex) => <button type="button" key={`${src}-${photoIndex}`} onClick={() => { if (didSwipe.current) { didSwipe.current = false; return; } setDragX(0); setLightbox(true); }} className="flex min-w-full cursor-zoom-in items-center justify-center" aria-label={`View photo ${photoIndex + 1} full screen`}><img draggable={false} src={src} alt={`${storeName} post photo ${photoIndex + 1}`} className={`h-auto max-w-full select-none object-contain ${detail ? "max-h-[82svh]" : "max-h-[76svh] sm:max-h-[760px]"}`} /></button>)}</div>
      {images.length > 1 ? <>
        <button type="button" onClick={() => move(index - 1)} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur sm:flex"><ChevronLeft /></button>
        <button type="button" onClick={() => move(index + 1)} aria-label="Next photo" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur sm:flex"><ChevronRight /></button>
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{index + 1} / {images.length}</span>
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">{images.map((_, dot) => <button type="button" aria-label={`Show photo ${dot + 1}`} key={dot} onClick={() => setIndex(dot)} className={`h-1.5 rounded-full shadow ${dot === index ? "w-5 bg-white" : "w-1.5 bg-white/55"}`} />)}</div>
      </> : null}
      {lightbox ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-[300] overflow-hidden bg-black/95" onClick={() => setLightbox(false)}><button type="button" className="absolute right-4 top-4 z-20 flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur" aria-label="Close photo" onClick={() => setLightbox(false)}><X /></button><div className="h-full w-full overflow-hidden" onClick={(event) => event.stopPropagation()} {...touchHandlers}><div className={`flex h-full touch-pan-y will-change-transform ${dragging ? "transition-none" : "transition-transform duration-300 ease-[cubic-bezier(.2,.85,.35,1)]"}`} style={trackStyle}>{images.map((src, photoIndex) => <div key={`full-${src}-${photoIndex}`} className="flex h-full min-w-full items-center justify-center p-2 sm:p-8"><img draggable={false} src={src} alt={`${storeName} post photo ${photoIndex + 1}`} className="max-h-full max-w-full select-none object-contain" /></div>)}</div></div>{images.length > 1 ? <><span className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur">{index + 1} / {images.length}</span><button type="button" disabled={index === 0} onClick={(event) => { event.stopPropagation(); move(index - 1); }} className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-25 sm:flex" aria-label="Previous photo"><ChevronLeft /></button><button type="button" disabled={index === images.length - 1} onClick={(event) => { event.stopPropagation(); move(index + 1); }} className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-25 sm:flex" aria-label="Next photo"><ChevronRight /></button></> : null}</div> : null}
    </div>
  );
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

  return <article id={post.id} className="relative rounded-[28px] border border-orange-100/90 bg-gradient-to-br from-white via-white to-orange-50/70 shadow-[0_20px_60px_rgba(106,57,27,.14)] ring-1 ring-white">
    <div className="flex items-center gap-3 rounded-t-[28px] bg-gradient-to-r from-orange-50/90 via-white to-rose-50/70 p-4 sm:p-5"><Link href={`/store/${post.store.slug}`} className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 shadow-sm">{post.store.logoUrl ? <img src={post.store.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={20} className="text-[#D4450A]" />}</Link><div className="min-w-0 flex-1"><Link href={`/store/${post.store.slug}`} className="block truncate text-sm font-black text-zinc-950 hover:text-[#D4450A]">{post.store.name}</Link><Link href={`/timeline/${post.id}`} className="text-[11px] text-zinc-400 hover:text-zinc-700"><time>{new Date(post.createdAt).toLocaleDateString("en-TT", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></Link></div><span className="rounded-full bg-gradient-to-r from-orange-100 to-rose-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#D4450A] shadow-sm">Update</span></div>
    <PhotoCarousel storeName={post.store.name} images={post.images} detail={detail} />
    <div className="p-4 sm:p-5"><div className="flex items-center gap-1"><button type="button" onClick={like} className={`rounded-full p-2.5 transition active:scale-90 ${liked ? "bg-rose-50 text-rose-600" : "text-zinc-700 hover:bg-rose-50 hover:text-rose-600"}`} aria-label={liked ? "Unlike" : "Like"}><Heart className="size-5" fill={liked ? "currentColor" : "none"} /></button><button type="button" onClick={() => document.getElementById(`comment-${post.id}`)?.focus()} className="rounded-full p-2.5 text-zinc-700 transition hover:bg-orange-50 hover:text-[#D4450A]" aria-label="Comment"><MessageCircle className="size-5" /></button><ShareActionButton title={post.store.name} text={post.caption} url={`/timeline/${post.id}`} label="" className="!min-h-10 !rounded-full !border-0 !px-2.5 !shadow-none" /><span className="ml-auto text-[11px] font-bold text-zinc-500 sm:text-xs">{post._count.likes} likes · {post._count.comments} comments</span></div>
      {post.caption ? <div className="mt-3 break-words text-sm leading-7 text-zinc-700"><Link href={`/store/${post.store.slug}`} className="mr-2 font-black text-zinc-950">{post.store.name}</Link><ReactMarkdown components={{ p: ({ children }) => <span className="whitespace-pre-wrap">{children}</span>, ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>, ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="mx-0.5 my-1 inline-flex max-w-full items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-gradient-to-r from-[#D4450A] via-[#F06A2A] to-[#E34D76] px-3 py-1.5 text-[11px] font-black text-white no-underline shadow-[0_6px_16px_rgba(212,69,10,.25)] transition hover:-translate-y-0.5 hover:shadow-lg"><Link2 className="size-3.5 shrink-0" />{children}</a> }}>{linkifyPlainUrls(post.caption)}</ReactMarkdown></div> : null}
      {post.searchTags?.length ? <details className="relative mt-3 w-fit"><summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-orange-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#B83A09] shadow-sm"><Tag className="size-3.5" /> Search tags ({post.searchTags.length}) <ChevronDown className="size-3.5" /></summary><div className="absolute left-0 top-[calc(100%+.4rem)] z-20 flex min-w-52 max-w-[min(82vw,340px)] flex-wrap gap-1.5 rounded-2xl border border-orange-100 bg-white p-3 shadow-[0_16px_45px_rgba(91,49,24,.18)]">{post.searchTags.map((tag) => <Link key={tag} href={`/timeline?scope=all&q=${encodeURIComponent(tag)}`} className="rounded-full bg-gradient-to-r from-orange-50 to-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#B83A09] hover:from-orange-100 hover:to-rose-100">#{tag}</Link>)}</div></details> : null}
      <AttachmentCards value={post.attachments} />
      {post.comments.length ? <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">{post.comments.map((entry) => <div key={entry.id}><p className="text-sm text-zinc-700"><strong className="mr-2 text-xs text-zinc-950">{entry.user.fullName}</strong>{entry.user.role === "VENDOR" ? <span className="mr-2 rounded-full bg-orange-50 px-1.5 py-0.5 text-[8px] font-black uppercase text-[#D4450A]">Vendor</span> : null}{entry.body}</p>{canComment ? <button type="button" className="ml-1 mt-1 text-[11px] font-bold text-zinc-400 hover:text-[#D4450A]" onClick={() => setReplying(entry.id)}>Reply</button> : null}{entry.replies.map((reply) => <p key={reply.id} className="ml-6 mt-2 border-l-2 border-orange-100 pl-3 text-xs text-zinc-600"><strong className="mr-2 text-zinc-900">{reply.user.fullName}</strong>{reply.user.role === "VENDOR" ? <span className="mr-2 text-[8px] font-black uppercase text-[#D4450A]">Vendor</span> : null}{reply.body}</p>)}{replying === entry.id ? <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); comment(entry.id, event.currentTarget); }}><input name="body" required maxLength={800} placeholder="Write a reply…" className="min-w-0 flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-orange-200" /><button disabled={pending} className="rounded-xl px-3 text-[#D4450A]" aria-label="Send reply"><Send size={16} /></button></form> : null}</div>)}</div> : null}
      {canComment ? <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); comment(undefined, event.currentTarget); }}><input id={`comment-${post.id}`} name="body" required maxLength={800} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200" /><button disabled={pending} className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#D4450A] text-white shadow-md shadow-orange-200" aria-label="Post comment"><Send size={17} /></button></form> : null}
    </div>
  </article>;
}
