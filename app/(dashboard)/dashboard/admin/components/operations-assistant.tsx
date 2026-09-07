"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, Download, Package, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askOperationsAssistant, executeOperationsAction } from "@/app/actions/admin-assistant";
import type { AssistantAction } from "@/lib/admin/assistant-actions";
type Turn = { role: "user" | "assistant"; content: string; actions?: AssistantAction[] };
export default function OperationsAssistant() {
  const [question,setQuestion] = useState("");
  const [turns,setTurns] = useState<Turn[]>([]);
  const [busy,setBusy] = useState(false);
  const [running,setRunning] = useState<string>();
  const [results,setResults] = useState<Record<string,{ok:boolean;message:string}>>({});
  async function ask(value: string) {
    if (busy || !value.trim()) return;
    setBusy(true); setQuestion(""); setTurns(prev=>[...prev,{role:"user",content:value}]);
    try { const r = await askOperationsAssistant(value,turns.map(t=>({role:t.role,content:t.content}))); setTurns(prev=>[...prev,{role:"assistant",content:r.answer ?? r.error ?? "No response",actions:r.actions}]); }
    catch { setTurns(prev=>[...prev,{role:"assistant",content:"Could not reach the assistant. Try again."}]); } finally {setBusy(false);}
  }
  async function execute(action: AssistantAction) {
    if (!action.token || running || !window.confirm(`${action.title}\n${action.detail}\nConfirm this change? It updates live order records and may notify customers or vendors.`)) return;
    setRunning(action.token);
    try { const r = await executeOperationsAction(action.token); const message=r.ok ? "Completed — order records updated." : r.error ?? "Could not complete action."; setResults(prev=>({...prev,[action.token!]:{ok:r.ok,message}})); setTurns(prev=>[...prev,{role:"assistant",content:`${action.title}: ${message}`}]); }
    catch { setResults(prev=>({...prev,[action.token!]:{ok:false,message:"Unable to confirm the result. Refresh the order before retrying."}})); } finally {setRunning(undefined);}
  }
  const chip="inline-flex min-h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-orange-300";
  return <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
    <header className="relative overflow-hidden bg-[#1C1C1A] p-6 text-white sm:p-8"><div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#D4450A]/30 blur-3xl"/><div className="relative flex items-start gap-4"><span className="rounded-2xl bg-white/10 p-3 text-orange-300"><Sparkles size={26}/></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">LinkWe operations</p><h2 className="mt-1 text-2xl font-semibold">Your working assistant</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">Find what needs attention, export records and move orders forward. Review and confirm each operational change.</p></div></div></header>
    <div className="p-4 sm:p-6"><div className="flex flex-wrap gap-2"><a className={chip} href="/api/admin/messages/export"><Download size={14}/>Export messages</a><a className={chip} href="/api/admin/orders/export"><Download size={14}/>Export orders</a><a className={chip} href="/api/admin/bays/export"><Download size={14}/>Export bays</a><Link className={chip} href="/dashboard/admin?tab=linkwe-delivery"><Package size={14}/>Warehouse</Link><Link className={chip} href="/dashboard/admin/guide">How Admin works →</Link></div>
    {!turns.length && <div className="my-6 grid gap-2 sm:grid-cols-2">{["What needs attention first?","Which received parcels need a bay?","Export messages from the last 30 days.","Help me move a vendor parcel to another bay."].map(q=><button key={q} onClick={()=>void ask(q)} disabled={busy} className="rounded-2xl border border-zinc-100 bg-[#F7F7F6] p-4 text-left text-sm text-zinc-600 hover:bg-orange-50">{q}</button>)}</div>}
    <div role="log" aria-live="polite" className="my-5 max-h-[580px] space-y-4 overflow-y-auto">{turns.map((turn,i)=><article key={i} className={turn.role==="user" ? "ml-6 rounded-2xl bg-orange-50 p-4 sm:ml-16" : "rounded-2xl border border-zinc-100 p-4"}><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">{turn.role==="user" ? "You" : "LinkWe assistant"}</p><div className="break-words text-sm leading-7 text-zinc-700 [&_a]:text-orange-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2"><ReactMarkdown>{turn.content}</ReactMarkdown></div>{turn.actions?.map((action,j)=><div key={j} className="mt-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4"><h3 className="text-sm font-semibold">{action.title}</h3><p className="my-2 break-words text-xs leading-5 text-zinc-600">{action.detail}</p>{action.href ? <a className={chip} href={action.href}><Download size={14}/>Download CSV</a> : action.token && <><button disabled={!!running || !!results[action.token]} onClick={()=>void execute(action)} className="min-h-11 rounded-xl bg-[#D4450A] px-4 text-sm font-semibold text-white disabled:opacity-40">{running===action.token ? "Applying…" : results[action.token]?.ok ? "Completed" : "Confirm and apply"}</button>{results[action.token] && <p role="status" className={`mt-2 text-xs ${results[action.token].ok ? "text-emerald-700" : "text-red-700"}`}>{results[action.token].ok && <CheckCircle2 size={13} className="mr-1 inline"/>}{results[action.token].message}</p>}</>}</div>)}</article>)}{busy && <p className="animate-pulse p-4 text-sm text-zinc-500">Reviewing orders and preparing your response…</p>}</div>
    <form onSubmit={e=>{e.preventDefault();void ask(question);}} className="flex items-end gap-2"><textarea aria-label="Ask LinkWe assistant" maxLength={2000} rows={2} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Move vendor order LW-… to bay 4, or export this month’s messages…" className="min-w-0 flex-1 resize-none rounded-2xl border border-zinc-200 p-3 text-sm outline-none focus:border-orange-400"/><button disabled={busy || !question.trim()} aria-label="Send request" className="min-h-12 rounded-xl bg-[#D4450A] px-4 text-white disabled:opacity-40"><ArrowUp size={20}/></button></form><p className="mt-3 text-[11px] leading-5 text-zinc-400">AI uses up to 150 open orders. Previews expire after 10 minutes and cannot overwrite newer order changes. CSF bookings are still completed in their merchant portal.</p></div>
  </section>;
}
