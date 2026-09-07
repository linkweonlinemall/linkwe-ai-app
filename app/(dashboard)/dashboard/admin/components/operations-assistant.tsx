"use client";
import { useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askOperationsAssistant } from "@/app/actions/admin-assistant";

export default function OperationsAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  async function ask(value: string) {
    if (busy || !value.trim()) return;
    setBusy(true); setAnswer("");
    try { const result = await askOperationsAssistant(value); setAnswer(result.answer ?? result.error ?? "No response."); }
    catch { setAnswer("Unable to reach the assistant. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-orange-50 p-5 sm:p-6">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2 text-violet-700"><Sparkles size={21}/></span><div><h2 className="font-semibold text-zinc-900">LinkWe operations intelligence</h2><p className="text-xs text-zinc-500">Ask about your queue, delays and next steps.</p></div></div>
    <div className="my-4 flex flex-wrap gap-2">{["What needs attention first?", "Which orders are waiting on vendors?", "Give me a dispatch checklist."].map((q) => <button key={q} disabled={busy} onClick={() => { setQuestion(q); void ask(q); }} className="rounded-full border border-violet-100 bg-white px-3 py-2 text-xs font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50">{q}</button>)}</div>
    <form onSubmit={(e) => { e.preventDefault(); void ask(question); }} className="flex gap-2"><input aria-label="Ask the operations assistant" maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Help me plan today's warehouse work…" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400"/><button disabled={busy || !question.trim()} aria-label="Send question" className="rounded-xl bg-violet-700 px-4 text-white disabled:opacity-50"><ArrowUp size={19}/></button></form>
    <div aria-live="polite" className="mt-3 text-sm leading-7 text-zinc-700 [&_a]:text-violet-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">{busy ? "Reviewing the latest operations snapshot…" : <ReactMarkdown>{answer}</ReactMarkdown>}</div>
    <p className="mt-2 text-[11px] text-zinc-400">AI recommendations use the current queue. Staff carry out changes and CSF bookings.</p>
  </section>;
}
