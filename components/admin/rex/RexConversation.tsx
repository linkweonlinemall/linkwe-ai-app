"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Check, ChevronDown, CircleAlert, LoaderCircle, Sparkles, UserRound } from "lucide-react";
import s from "./rex.module.css";

export type RexMessage = { role: "user" | "assistant"; content: string; outcome?: "success" | "error" | "review" };
export type RexPhase = "idle" | "thinking" | "working" | "review" | "done" | "error";

export default function RexConversation({ title, subtitle, messages, question, onQuestion, onSubmit, phase, activity, disabled, suggestions, footnote, welcome = "Tell me what you want to create or change." }: {
  title: string; subtitle: string; messages: RexMessage[]; question: string;
  onQuestion: (value: string) => void; onSubmit: (event: React.FormEvent) => void;
  phase: RexPhase; activity?: string; disabled?: boolean; suggestions: string[]; footnote: string; welcome?: string;
}) {
  const transcript = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [elapsed, setElapsed] = useState(0);
  const [unread, setUnread] = useState(false);
  const active = phase === "thinking" || phase === "working";
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    const el = transcript.current;
    if (el && follow.current) el.scrollTop = el.scrollHeight;
  }, [messages, phase, activity]);
  const status = { idle: "Ready to help", thinking: "Thinking", working: "Working", review: "Waiting for your review", done: "Completed", error: "Needs attention" }[phase];
  return <section className={s.panel} aria-label={title}>
    <header className={s.header}><span className={s.avatar}><Sparkles size={22}/></span><div><h2>{title}</h2><p><span className={s.statusDot} data-phase={phase}/>{status}</p></div><span className={s.badge}>REX</span></header>
    <p className={s.intro}>{subtitle}</p>
    {!messages.length && <div className={s.suggestions}>{suggestions.map(text => <button type="button" disabled={disabled} key={text} onClick={() => onQuestion(text)}>{text}<ArrowUp size={14}/></button>)}</div>}
    <div className={s.transcript} ref={transcript} role="log" aria-label="Conversation with Rex" aria-live="polite" aria-relevant="additions text" onScroll={() => { const el = transcript.current!; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; setUnread(!follow.current); }}>
      {!messages.length && <div className={s.empty}><Sparkles size={20}/><p>{welcome}<br/>We can work through it together.</p></div>}
      {messages.map((message, index) => <article key={index} className={message.role === "user" ? s.userMessage : s.rexMessage} data-outcome={message.outcome}><div className={s.messageLabel}>{message.role === "user" ? <UserRound size={12}/> : message.outcome === "success" ? <Check size={13}/> : message.outcome === "error" ? <CircleAlert size={13}/> : <Sparkles size={13}/>}<span>{message.role === "user" ? "You" : message.outcome === "success" ? "Rex · completed" : message.outcome === "review" ? "Rex · ready for review" : "Rex"}</span></div><ReactMarkdown>{message.content}</ReactMarkdown></article>)}
      {active && <div className={s.activity} role="status"><div><LoaderCircle size={15} className={s.spin}/><strong>{status}<span className={s.dots}><i/><i/><i/></span></strong><small>{elapsed > 0 ? `${elapsed}s` : ""}</small></div><p>{activity || (phase === "thinking" ? "Reading your request and checking the current details…" : "Applying your requested changes…")}</p></div>}
      {phase === "review" && <p className={s.reviewStatus}>Your review is ready. Changes in that review haven’t been applied yet.</p>}
    </div>
    {unread && <button type="button" className={s.latest} onClick={() => { follow.current = true; setUnread(false); const el = transcript.current; if (el) el.scrollTop = el.scrollHeight; }}>Back to latest<ChevronDown size={13}/></button>}
    <form onSubmit={onSubmit} className={s.composer}><textarea aria-label={`Message ${title}`} placeholder="Ask Rex to help…" rows={3} value={question} maxLength={6000} onChange={e => onQuestion(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (!disabled && question.trim()) e.currentTarget.form?.requestSubmit(); } }}/><div><span>Enter to send · Shift + Enter for a new line</span><button type="submit" aria-label="Send request to Rex" disabled={disabled || !question.trim()}>{active ? <LoaderCircle className={s.spin} size={17}/> : <ArrowUp size={18}/>}</button></div></form>
    <p className={s.footnote}>{footnote}</p>
  </section>;
}
