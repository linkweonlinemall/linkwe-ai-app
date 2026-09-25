"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, ChevronDown, ChevronUp, Clock3, Info, MailOpen, MessageCircle, MessagesSquare, Package, RefreshCw, Search, Send, Sparkles, X, Zap } from "lucide-react";
import { getConversationMessages, getMyConversations, markVendorConversationRead, sendMessage, touchMessagePresence } from "@/app/actions/messages";
import { formatConversationListTime } from "@/lib/messages/format-time";
import { MESSAGE_MAX_LENGTH, clearSeenUnread, draftKey, filterInbox, initials, mergeChatMessages, messageClock, messageDay, messageParts, quickReplies, recentlyActive, type InboxFilter, type MessageContext, type VendorChatMessage, type VendorInboxRow } from "@/lib/messages/vendor-inbox";
import s from "./messages.module.css";

type Props = {
  currentUserId: string; selectedId: string | null; initialRows: VendorInboxRow[];
  initialMessages: VendorChatMessage[]; initialSnapshotAt: string | null;
  context: MessageContext | null; renderedAt: string;
};

function ChatSculpture({ compact = false }: { compact?: boolean }) {
  return <div className={`${s.sculpture} ${compact ? s.compactSculpture : ""}`} aria-hidden="true"><div className={s.orbit} /><div className={s.bubbleBack}><Check size={30} strokeWidth={3} /></div><div className={s.bubbleFront}><i /><i /><i /></div><div className={s.spark}><Sparkles size={19} /></div></div>;
}
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((part, index) => part.toLowerCase() === query.trim().toLowerCase() ? <mark key={index}>{part}</mark> : part)}</>;
}

export default function VendorMessagesWorkspace({ currentUserId, selectedId, initialRows, initialMessages, initialSnapshotAt, context, renderedAt }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [messages, setMessages] = useState(initialMessages);
  const [now, setNow] = useState(Date.parse(renderedAt));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [sort, setSort] = useState("recent");
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [inboxError, setInboxError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [threadQuery, setThreadQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [showReplies, setShowReplies] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [newBelow, setNewBelow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const latestRead = useRef(initialSnapshotAt);
  const nearBottom = useRef(true);
  const forceBottom = useRef(true);
  const sendLock = useRef(false);
  const retry = useRef<{ text: string; id: string } | null>(null);
  const live = useRef(true);
  const inboxBusy = useRef(false);
  const threadBusy = useRef(false);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());
  const selected = rows.find(row => row.id === selectedId);
  const unreadCount = rows.filter(row => row.unread > 0).length;
  const replyCount = rows.filter(row => row.lastSenderRole === "CUSTOMER").length;
  const visibleRows = useMemo(() => filterInbox(rows, query, filter, sort), [rows, query, filter, sort]);
  const matches = useMemo(() => threadQuery.trim() ? messages.filter(message => message.content.toLowerCase().includes(threadQuery.trim().toLowerCase())).map(message => message.id) : [], [messages, threadQuery]);

  const readVisible = useCallback(async (snapshot: string) => {
    if (!selectedId || document.visibilityState !== "visible" || !document.hasFocus()) return;
    const result = await markVendorConversationRead(selectedId, snapshot);
    if (live.current && result.ok && result.cleared) setRows(current => clearSeenUnread(current, selectedId, snapshot));
  }, [selectedId]);
  const refreshInbox = useCallback(async () => {
    if (inboxBusy.current || document.visibilityState !== "visible") return;
    inboxBusy.current = true; setRefreshing(true);
    try {
      const result = await getMyConversations();
      if (!live.current) return;
      if (!result.ok || result.side !== "vendor") throw new Error("Inbox unavailable");
      setRows(result.conversations.map(row => ({ ...row, lastMessageAt: row.lastMessageAt.toISOString(), lastSeenAt: row.lastSeenAt?.toISOString() ?? null })));
      setNow(Date.now()); setInboxError("");
      if (latestRead.current) await readVisible(latestRead.current);
    } catch { if (live.current) setInboxError("Inbox paused. Your conversations are still here."); }
    finally { inboxBusy.current = false; if (live.current) setRefreshing(false); }
  }, [readVisible]);
  const refreshThread = useCallback(async () => {
    if (!selectedId || threadBusy.current || document.visibilityState !== "visible") return;
    threadBusy.current = true;
    try {
      const result = await getConversationMessages(selectedId, false);
      if (!live.current) return;
      if (!result.ok) { setThreadError(result.error); return; }
      const incoming = result.messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString() }));
      setMessages(current => mergeChatMessages(current, incoming));
      latestRead.current = result.snapshotAt.toISOString();
      setThreadError("");
      await readVisible(latestRead.current);
    } catch { if (live.current) setThreadError("Connection interrupted. We’ll keep trying. Your draft is safe."); }
    finally { threadBusy.current = false; }
  }, [selectedId, readVisible]);

  useEffect(() => {
    live.current = true;
    const refresh = () => { void refreshInbox(); void refreshThread(); };
    const presence = () => { if (document.visibilityState === "visible") void touchMessagePresence().catch(() => {}); };
    if (initialSnapshotAt) void readVisible(initialSnapshotAt).catch(() => {});
    presence();
    const inboxTimer = window.setInterval(() => void refreshInbox(), 15000);
    const threadTimer = selectedId ? window.setInterval(() => void refreshThread(), 6000) : null;
    const presenceTimer = window.setInterval(presence, 60000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { live.current = false; clearInterval(inboxTimer); if (threadTimer) clearInterval(threadTimer); clearInterval(presenceTimer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, [selectedId, initialSnapshotAt, refreshInbox, refreshThread, readVisible]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`linkwe:inbox-view:${currentUserId}`) ?? "null");
      if (saved) {
        if (typeof saved.query === "string") setQuery(saved.query);
        if (["all", "unread", "reply"].includes(saved.filter)) setFilter(saved.filter);
        if (["recent", "oldest", "name"].includes(saved.sort)) setSort(saved.sort);
      }
    } catch { /* Use the default inbox view if browser storage is unavailable. */ }
    setFiltersLoaded(true);
  }, [currentUserId]);
  useEffect(() => {
    if (!filtersLoaded) return;
    try { sessionStorage.setItem(`linkwe:inbox-view:${currentUserId}`, JSON.stringify({ query, filter, sort })); } catch { /* Optional preference persistence. */ }
  }, [currentUserId, query, filter, sort, filtersLoaded]);
  useEffect(() => {
    if (!selectedId) return;
    try { setDraft(sessionStorage.getItem(draftKey(currentUserId, selectedId)) ?? ""); } catch { /* Storage can be unavailable in private browsing. */ }
    setDraftLoaded(true);
  }, [currentUserId, selectedId]);
  useEffect(() => {
    if (!selectedId || !draftLoaded) return;
    try {
      if (draft) sessionStorage.setItem(draftKey(currentUserId, selectedId), draft);
      else sessionStorage.removeItem(draftKey(currentUserId, selectedId));
      setDraftSaved(Boolean(draft));
    } catch { setDraftSaved(false); }
    const input = inputRef.current;
    if (input) { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 132)}px`; }
  }, [draft, draftLoaded, currentUserId, selectedId]);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    if (nearBottom.current || forceBottom.current) { scroller.scrollTop = scroller.scrollHeight; setNewBelow(false); forceBottom.current = false; }
    else setNewBelow(true);
  }, [messages.length]);
  useEffect(() => { if (showSearch) searchRef.current?.focus(); }, [showSearch]);
  useEffect(() => {
    const id = matches[matchIndex % Math.max(matches.length, 1)];
    if (id) { nearBottom.current = false; messageRefs.current.get(id)?.scrollIntoView({ block: "center", behavior: "auto" }); }
  }, [matches, matchIndex]);

  async function submitMessage() {
    if (!selectedId || sendLock.current || !draft.trim() || draft.length > MESSAGE_MAX_LENGTH) return;
    const originalDraft = draft;
    const text = draft.trim();
    const storageKey = draftKey(currentUserId, selectedId);
    // Keep the same send reference through navigation/reload after an uncertain response.
    if (!retry.current) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(`${storageKey}:attempt`) ?? "null");
        if (saved && saved.text === text && typeof saved.id === "string") retry.current = saved;
      } catch { /* Sending still works when browser storage is unavailable. */ }
    }
    if (!retry.current || retry.current.text !== text) retry.current = { text, id: crypto.randomUUID() };
    try { sessionStorage.setItem(`${storageKey}:attempt`, JSON.stringify(retry.current)); } catch { /* Optional retry persistence. */ }
    sendLock.current = true; setSending(true); setSendError("");
    try {
      const result = await sendMessage(selectedId, text, retry.current.id);
      if (result.ok) {
        try {
          if (sessionStorage.getItem(storageKey) === originalDraft) sessionStorage.removeItem(storageKey);
          if (live.current) sessionStorage.removeItem(`${storageKey}:attempt`);
        } catch { /* The server-confirmed message is still available in the thread. */ }
      }
      if (!live.current) return;
      if (!result.ok) { setSendError(result.error); return; }
      const sent = { ...result.message, createdAt: result.message.createdAt.toISOString() };
      forceBottom.current = true; nearBottom.current = true;
      setMessages(current => mergeChatMessages(current, [sent]));
      setDraft(current => current === originalDraft ? "" : current);
      setRows(current => current.map(row => row.id === selectedId ? { ...row, lastMessageText: text, lastMessageAt: sent.createdAt, lastSenderRole: "VENDOR" } : row));
      retry.current = null;
      inputRef.current?.focus();
    } catch { if (live.current) setSendError("Message wasn’t confirmed. Your draft is saved here; try sending again."); }
    finally { sendLock.current = false; if (live.current) setSending(false); }
  }
  function jumpLatest() { const node = scrollRef.current; if (node) node.scrollTop = node.scrollHeight; nearBottom.current = true; setNewBelow(false); }
  function insertReply(text: string) { setDraft(current => current ? `${current}\n\n${text}`.slice(0, MESSAGE_MAX_LENGTH) : text); setShowReplies(false); inputRef.current?.focus(); }

  return <div className={`${s.workspace} ${selectedId ? s.hasThread : ""}`}>
    <header className={s.hero}>
      <div><p className={s.eyebrow}><span /> YOUR CUSTOMER CONNECTION</p><h1>A little hello.<br /><em>A lasting connection.</em></h1><p>Thoughtful replies. Happy customers. All in one place.</p></div>
      <ChatSculpture compact />
      <div className={s.metrics} aria-label="Inbox overview">
        <button onClick={() => setFilter("all")} aria-pressed={filter === "all"}><MessagesSquare size={18} /><strong>{rows.length}</strong><span>Conversations</span></button>
        <button onClick={() => setFilter("unread")} aria-pressed={filter === "unread"}><MailOpen size={18} /><strong>{unreadCount}</strong><span>Unread chats</span></button>
        <button onClick={() => setFilter("reply")} aria-pressed={filter === "reply"}><Clock3 size={18} /><strong>{replyCount}</strong><span>Awaiting your reply</span></button>
      </div>
    </header>
    <div className={s.workbench}>
      <aside className={s.inbox} aria-label="Customer conversations">
        <div className={s.inboxHeading}><div><p className={s.eyebrow}>LET’S TALK BUSINESS</p><h2>Messages <span>{rows.length}</span></h2></div><button className={s.iconButton} aria-label="Refresh inbox" onClick={() => void refreshInbox()} disabled={refreshing}><RefreshCw size={17} className={refreshing ? s.spinning : ""} /></button></div>
        <label className={s.search} data-tour="message-search"><Search size={17} /><input aria-label="Search conversations" placeholder="Find a customer or message" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear inbox search" onClick={() => setQuery("")}><X size={15} /></button>}</label>
        <div className={s.filters} data-tour="message-filters" aria-label="Filter conversations">{([["all","All"],["unread","Unread"],["reply","Needs reply"]] as const).map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}{value === "unread" && unreadCount > 0 && <b>{unreadCount}</b>}</button>)}</div>
        <div className={s.listMeta}><span>{visibleRows.length} {visibleRows.length === 1 ? "conversation" : "conversations"}</span><select aria-label="Sort conversations" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></div>
        {inboxError && <div className={s.inlineError} role="status">{inboxError}<button onClick={() => void refreshInbox()}>Retry</button></div>}
        <div className={s.conversationList} data-tour="message-list">{visibleRows.length ? visibleRows.map((row, index) => <Link key={row.id} href={`/dashboard/vendor/messages/${row.id}`} prefetch={false} className={`${s.conversation} ${row.unread > 0 ? s.unread : ""}`} aria-current={row.id === selectedId ? "page" : undefined}>
          <span className={s.avatar} data-tone={index % 4}>{initials(row.customerName)}{recentlyActive(row.lastSeenAt, now) && <i title="Active recently" />}</span>
          <span className={s.conversationCopy}><span><strong>{row.customerName}</strong><time dateTime={row.lastMessageAt}>{formatConversationListTime(new Date(row.lastMessageAt), new Date(now))}</time></span><span><p>{row.lastSenderRole === "VENDOR" && <Check size={13} />}{row.lastMessageText || "Start the conversation"}</p>{row.unread > 0 && <b aria-label={`${row.unread} unread messages`}>{row.unread > 99 ? "99+" : row.unread}</b>}</span></span>
        </Link>) : <div className={s.emptyInbox}><Search size={28} /><h3>{rows.length ? "No conversations found" : "Your next hello starts here"}</h3><p>{rows.length ? "Try another name or choose a different filter." : "Customer messages will appear here. You can also start a conversation from an order."}</p>{rows.length ? <button onClick={() => { setQuery(""); setFilter("all"); }}>Show all conversations</button> : <Link href="/dashboard/vendor/orders">Go to orders <ArrowUpRight size={14} /></Link>}</div>}</div>
        <div className={s.inboxFoot}><span /> {inboxError ? "Reconnecting to your inbox" : "Your inbox refreshes automatically"}</div>
      </aside>
      {!selectedId || !selected ? <section className={s.welcome} aria-label="Welcome to your inbox"><div className={s.welcomeInner}><ChatSculpture /><p className={s.eyebrow}>GREAT SERVICE STARTS WITH A CONVERSATION</p><h2>Make every customer<br /><em>feel like a regular.</em></h2><p>Choose a conversation to pick up where you left off. Your messages, quick replies and customer orders are right here.</p><div className={s.welcomeFeatures}><span><Zap size={17} /> Reply a little faster</span><span><Package size={17} /> Keep orders close</span></div><Link href="/dashboard/vendor/orders" className={s.secondaryLink}>Start from an order <ArrowUpRight size={16} /></Link></div><div className={s.welcomeNote}><MessageCircle size={18} /><span>A personal touch goes a long way.<br /><strong>We people. We business. We local.</strong></span></div></section> : <section className={s.chat} aria-label={`Conversation with ${selected.customerName}`}>
        <header className={s.chatHeader}><Link href="/dashboard/vendor/messages" className={`${s.iconButton} ${s.chatBack}`} aria-label="Back to inbox"><ArrowLeft size={19} /></Link><span className={s.avatar}>{initials(selected.customerName)}</span><div className={s.chatIdentity}><h2>{selected.customerName}</h2><p><span data-active={recentlyActive(selected.lastSeenAt, now)} />{recentlyActive(selected.lastSeenAt, now) ? "Active recently" : "Customer conversation"}</p></div><button className={s.iconButton} aria-label={showSearch ? "Close conversation search" : "Search this conversation"} aria-expanded={showSearch} onClick={() => { setShowSearch(!showSearch); setThreadQuery(""); }}><Search size={19} /></button><button className={`${s.iconButton} ${showContext ? s.activeIcon : ""}`} aria-label="Customer details and orders" aria-expanded={showContext} aria-controls="message-customer-context" onClick={() => setShowContext(!showContext)}><Info size={19} /></button></header>
        {showSearch && <div className={s.threadSearch}><Search size={16} /><input ref={searchRef} aria-label="Search messages in this conversation" placeholder="Find something in this chat" value={threadQuery} onChange={event => { setThreadQuery(event.target.value); setMatchIndex(0); }} /><small>{threadQuery.trim() ? matches.length ? `${matchIndex % matches.length + 1} / ${matches.length}` : "No matches" : ""}</small><button aria-label="Previous search result" disabled={!matches.length} onClick={() => setMatchIndex((matchIndex + matches.length - 1) % matches.length)}><ChevronUp size={17} /></button><button aria-label="Next search result" disabled={!matches.length} onClick={() => setMatchIndex((matchIndex + 1) % matches.length)}><ChevronDown size={17} /></button></div>}
        {showContext && <div id="message-customer-context" className={s.context}><div className={s.contextHeading}><div><strong>Customer at a glance</strong><p>{context ? `In touch since ${messageDay(context.since)}` : "Your shared order history"}</p></div><button className={s.iconButton} aria-label="Close customer details" onClick={() => setShowContext(false)}><X size={17} /></button></div><div className={s.contextOrders}>{context && (context.orders.length || context.services.length) ? <>{context.orders.map(order => <Link href={order.href} key={order.id}><span className={s.contextIcon}><Package size={18} /></span><span><b>{order.reference}</b><strong>{order.title}</strong><small>{order.status} · {order.amount}</small></span><ArrowUpRight size={16} /></Link>)}{context.services.map(service => <Link href={service.href} key={service.id}><span className={s.contextIcon}><Sparkles size={18} /></span><span><strong>{service.title}</strong><small>{service.status}</small></span><ArrowUpRight size={16} /></Link>)}</> : <p>No orders with your store yet. You can still help them find their next favourite.</p>}</div></div>}
        {threadError && <div className={s.inlineError} role="status">{threadError}<button onClick={() => void refreshThread()}>Retry</button></div>}
        <div ref={scrollRef} data-tour="message-thread" className={s.messages} role="log" aria-label="Conversation messages" aria-relevant="additions" onScroll={() => { const node = scrollRef.current; if (node) { nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 90; if (nearBottom.current) setNewBelow(false); } }}>
          <div className={s.threadStart}><MessageCircle size={17} /><span>This is the start of your conversation with {selected.customerName.split(" ")[0]}.</span></div>
          {messages.length === 0 && <div className={s.emptyThread}><h3>Break the ice.</h3><p>Say hello or choose a quick reply below to get started.</p></div>}
          {messages.map((message, index) => {
            const own = message.senderId === currentUserId;
            const support = message.senderRole === "ADMIN";
            const date = messageDay(message.createdAt);
            const showDay = index === 0 || messageDay(messages[index - 1].createdAt) !== date;
            return <div key={message.id} ref={node => { if (node) messageRefs.current.set(message.id, node); else messageRefs.current.delete(message.id); }} className={s.messageGroup}>
              {showDay && <div className={s.day}><span>{date}</span></div>}
              <div className={`${s.messageRow} ${own ? s.own : ""} ${support ? s.support : ""}`}><div className={s.messageBubble}>{support && <strong className={s.supportLabel}><Sparkles size={12} /> LinkWe Support</strong>}<p>{messageParts(message.content).map((part, partIndex) => part.href ? <a key={partIndex} href={part.href} target="_blank" rel="noopener noreferrer"><Highlight text={part.text} query={threadQuery} /></a> : <Highlight key={partIndex} text={part.text} query={threadQuery} />)}</p><div><time dateTime={message.createdAt}>{messageClock(message.createdAt)}</time>{own && <span aria-label="Sent"><Check size={12} /> Sent</span>}</div></div></div>
            </div>;
          })}
        </div>
        {newBelow && <button className={s.jumpLatest} onClick={jumpLatest}><ArrowDown size={14} /> Latest messages</button>}
        <div className={s.composerArea}>
          {showReplies && <div className={s.quickReplies} id="quick-replies"><div><strong>A head start. Make it yours.</strong><button aria-label="Close quick replies" onClick={() => setShowReplies(false)}><X size={16} /></button></div>{quickReplies(selected.customerName).map(reply => <button key={reply.label} onClick={() => insertReply(reply.text)}><Zap size={14} /><span>{reply.label}</span><span>+</span></button>)}</div>}
          <div className={s.composerToolbar}><button onClick={() => setShowReplies(!showReplies)} aria-expanded={showReplies} aria-controls="quick-replies"><Zap size={15} /> Quick replies <ChevronUp size={13} className={showReplies ? s.flip : ""} /></button><span>{draftSaved ? "Draft saved in this tab" : "A little care in every reply"}</span></div>
          {sendError && <p className={s.sendError} role="alert">{sendError}</p>}
          <form className={s.composer} data-tour="message-composer" onSubmit={event => { event.preventDefault(); void submitMessage(); }}><label className={s.srOnly} htmlFor="vendor-message">Message to {selected.customerName}</label><textarea id="vendor-message" ref={inputRef} rows={1} placeholder={`Message ${selected.customerName.split(" ")[0]}…`} value={draft} maxLength={MESSAGE_MAX_LENGTH} disabled={!draftLoaded} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !window.matchMedia("(pointer: coarse)").matches) { event.preventDefault(); void submitMessage(); } }} /><button type="submit" aria-label={sending ? "Sending message" : "Send message"} disabled={sending || !draft.trim() || draft.length > MESSAGE_MAX_LENGTH}><Send size={18} /><span>{sending ? "Sending…" : "Send"}</span></button></form>
          <div className={s.composerHint}><span>Every reply, in one place.</span><span>{draft.length > 4500 ? `${draft.length.toLocaleString()} / 5,000` : <><kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line</>}</span></div>
        </div>
      </section>}
    </div>
  </div>;
}
