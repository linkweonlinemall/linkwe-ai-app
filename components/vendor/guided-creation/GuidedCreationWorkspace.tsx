"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, FileCheck2, FolderOpen, Plus, Printer, RotateCcw } from "lucide-react";
import { getCreationGuide, listCreationGuides, saveCreationGuide, startCreationGuide } from "@/app/actions/guided-creation";
import { changeAnswer, guideFormHref, guideJourney, GUIDE_ROOT, GUIDE_VERSION, TYPE_GUIDANCE, type Answers, type GuidePlan } from "@/lib/vendor/guided-creation/model";
import GuideChecklist from "./GuideChecklist";
import s from "./guide.module.css";

type Library = Awaited<ReturnType<typeof listCreationGuides>>;
export default function GuidedCreationWorkspace({ library, initialPlan, initialError }: { library: Library; initialPlan: GuidePlan | null; initialError: string }) {
  const [plans, setPlans] = useState(library.plans), [cursor, setCursor] = useState(library.nextCursor);
  const [plan, setPlan] = useState(initialPlan), [answers, setAnswers] = useState<Answers>(initialPlan?.answers ?? {});
  const [title, setTitle] = useState(initialPlan?.title ?? ""), [newTitle, setNewTitle] = useState("");
  const [checked, setChecked] = useState(initialPlan?.checked ?? []);
  const [index, setIndex] = useState(() => initialPlan ? initialIndex(initialPlan) : 0);
  const [error, setError] = useState(initialError), [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const journey = guideJourney(answers), question = journey.questions[index];
  const result = !question ? journey.result : null;
  const dirty = !!plan && (title !== plan.title || JSON.stringify(answers) !== JSON.stringify(plan.answers) || JSON.stringify(checked) !== JSON.stringify(plan.checked));
  useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  useEffect(() => { heading.current?.focus(); }, [index, plan?.id]);

  function open(saved: GuidePlan) { setPlan(saved); setAnswers(saved.answers); setChecked(saved.checked); setTitle(saved.title); setIndex(initialIndex(saved)); setError(""); setMessage(""); }
  function remember(saved: GuidePlan) { setPlan(saved); setAnswers(saved.answers); setChecked(saved.checked); setTitle(saved.title); setPlans(old => old.some(p => p.id === saved.id) ? old.map(p => p.id === saved.id ? saved : p) : [saved, ...old]); }
  async function persist(nextChecked = checked) {
    if (!plan) throw Error("Start a guide first.");
    const saved = await saveCreationGuide({ id: plan.id, version: plan.version, title, answers, checked: nextChecked });
    remember(saved); setMessage("Saved to your store."); return saved;
  }
  function run(work: () => Promise<void>) { setError(""); setMessage(""); start(async () => { try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save. Try again."); } }); }
  const formHref = result && plan ? guideFormHref(result, plan.id) : null;

  return <div className={s.workspace}>
    <Link href="/dashboard/vendor/creation" className={s.back}><ArrowLeft size={15}/> Creation Zone</Link>
    <header className={s.hero}>
      <div><p className={s.eyebrow}><Compass size={15}/> GUIDED CREATION</p><h1>A clear start.<br/><em>A listing that fits.</em></h1><p>A few simple questions. The right setup.<br/>Follow your checklist and build it yourself.</p><span className={s.free}><Check size={14}/> Free for every vendor · No AI credits</span></div>
      <div className={s.heroCard}><span className={s.cardIcon}><BookOpen size={28}/></span><span className={s.eyebrow}>YOUR NEXT CREATION</span><strong>From “where do I start?”<br/>to “I’ve got this.”</strong><ol><li>Tell us what you sell</li><li>Get your setup plan</li><li>Build it, step by step</li></ol></div>
    </header>
    {error && <div className={s.error} role="alert"><p>{error}</p>{plan && <button disabled={pending} onClick={() => run(async () => open(await getCreationGuide(plan.id)))}>Reload saved version</button>}</div>}
    {message && <p className={s.notice} role="status">{message}</p>}
    {!plan ? <>
      <section className={s.startCard}><div><p className={s.eyebrow}>START WITH YOUR IDEA</p><h2>What are you creating?</h2><p>Give your guide a name so it is easy to find later. This does not create or publish a listing.</p></div>
        <form onSubmit={event => { event.preventDefault(); run(async () => { const saved = await startCreationGuide(newTitle); setPlans(old => [saved, ...old]); setNewTitle(""); open(saved); }); }}><label htmlFor="guide-name">Name your guide</label><input id="guide-name" maxLength={100} required placeholder="e.g. My new T-shirt collection" value={newTitle} onChange={event => setNewTitle(event.target.value)}/><button className={s.primary} disabled={pending || !newTitle.trim()}>{pending ? "Starting…" : "Start my guide"}<ArrowRight size={17}/></button></form>
      </section>
      <section className={s.library}><div className={s.sectionHeading}><div><p className={s.eyebrow}>PICK UP WHERE YOU LEFT OFF</p><h2>Your saved guides <FolderOpen size={21}/></h2></div><span>Saved with your store</span></div>
        {plans.length ? <div className={s.planGrid}>{plans.map(item => { const r = guideJourney(item.answers).result; return <button key={item.id} className={s.planCard} disabled={pending} onClick={() => run(async () => open(await getCreationGuide(item.id)))}><span className={s.planIcon}><FileCheck2 size={22}/></span><span><small>{r ? r.kind === "review" ? "Needs clarification" : "Setup plan ready" : "In progress"}</small><strong>{item.title}</strong><span>{r?.title ?? "Continue your questions"}</span><time>{new Date(item.updatedAt).toLocaleDateString("en-TT", { timeZone: "America/Port_of_Spain", day: "numeric", month: "short", year: "numeric" })}</time></span><ChevronRight size={18}/></button>; })}</div> : <div className={s.empty}><BookOpen size={28}/><h3>Your first guide starts above.</h3><p>Save questions, come back later, and keep your checklist while you build.</p></div>}
        {cursor && <button className={s.secondary} disabled={pending} onClick={() => run(async () => { const next = await listCreationGuides(cursor); setPlans(old => [...new Map([...old, ...next.plans].map(p => [p.id, p])).values()]); setCursor(next.nextCursor); })}>Show more saved guides</button>}
      </section>
      <section className={s.typeOverview}><p className={s.eyebrow}>A QUICK WAY TO TELL THEM APART</p><h2>One offer. The right starting point.</h2><div>{TYPE_GUIDANCE.map(([name, description]) => <article key={name}><h3>{name}</h3><p>{description}</p></article>)}</div></section>
    </> : <section className={s.editor}>
      <div className={s.editorTop}><button className={s.textButton} disabled={pending} onClick={() => run(async () => { if (dirty) await persist(); setPlan(null); setMessage(""); })}><ArrowLeft size={15}/> All guides</button><span role="status">{pending ? "Saving…" : dirty ? "Unsaved changes" : "Saved to your store"}</span><button className={s.textButton} disabled={pending} onClick={() => run(async () => { await persist(); setPlan(null); })}>Save & exit</button></div>
      <label className={s.titleLabel}>Guide name<input value={title} maxLength={100} onChange={event => setTitle(event.target.value)}/></label>
      <nav className={s.stages} aria-label="Guide progress"><span data-active={!!question}><Compass size={16}/> Your answers</span><ChevronRight size={14}/><span data-active={!!result}><FileCheck2 size={16}/> Your setup plan</span></nav>
      {question ? <div className={s.questionLayout}><div className={s.question}>
        <p className={s.eyebrow}>QUESTION {index + 1}</p><h2 ref={heading} tabIndex={-1} id="guide-question">{question.title}</h2><p>{question.help}</p>
        <fieldset className={s.choices} aria-labelledby="guide-question">{question.choices.map(option => <label key={option.value} className={s.choice} data-selected={answers[question.id] === option.value}><input type="radio" name={question.id} value={option.value} checked={answers[question.id] === option.value} disabled={pending} onChange={() => { setAnswers(changeAnswer(answers, question.id, option.value)); setChecked([]); setMessage(""); }}/><span><strong>{option.label}</strong><small>{option.example}</small></span></label>)}</fieldset>
        <div className={s.actions}><button className={s.secondary} disabled={pending || index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft size={16}/> Back</button><button className={s.primary} disabled={pending || !answers[question.id] || !title.trim()} onClick={() => run(async () => { await persist(); setIndex(i => i + 1); })}>{pending ? "Saving…" : journey.result && index === journey.questions.length - 1 ? "See my setup plan" : "Save & continue"}<ArrowRight size={16}/></button></div>
      </div><aside className={s.tip}><BookOpen size={27}/><h3>No specialist knowledge needed.</h3><p>Choose the closest answer. “I’m not sure” gives you simpler examples.</p><hr/><p>You can go back at any time. Changing an earlier answer clears later choices so your plan stays consistent.</p><small>Progress saves when you continue or choose Save & exit.</small></aside></div> : result && <div className={s.resultLayout}>
        <div><div className={s.recommendation}><p className={s.eyebrow}>{result.kind === "review" ? "LET’S GET A LITTLE CLEARER" : "YOUR RECOMMENDED SETUP"}</p><h2 ref={heading} tabIndex={-1}>{result.title}</h2><p>{result.reason}</p><div className={s.actions}>{formHref && <Link className={s.primary} href={formHref}>Build with this checklist <ArrowRight size={17}/></Link>}<button className={s.secondary} disabled={pending} onClick={() => setIndex(0)}><RotateCcw size={15}/> Change answers</button></div><small>{formHref ? "Your checklist stays beside the form. Jump to each section and check off steps as you build." : "Work through the clarification steps below, then revisit your answers."}</small></div>
          {plan.guideVersion !== GUIDE_VERSION && <p className={s.notice}>Guidance has been updated. Review the current checklist and save it again.</p>}
          <div className={s.checklistPanel}><div className={s.sectionHeading}><h3>Your build checklist</h3><button className={s.textButton} onClick={() => window.print()}><Printer size={15}/> Print</button></div><GuideChecklist result={result} checked={checked} disabled={pending} onChange={next => { setChecked(next); run(async () => { await persist(next); }); }}/></div>
          <details className={s.answerSummary}><summary>Your answers</summary><dl>{journey.questions.map(q => <div key={q.id}><dt>{q.title}</dt><dd>{q.choices.find(c => c.value === answers[q.id])?.label}</dd></div>)}</dl></details>
        </div><aside className={s.prepare}><span className={s.cardIcon}><Plus size={23}/></span><h3>Have these ready</h3><ul>{result.prepare.map(item => <li key={item}>{item}</li>)}</ul><hr/><h3>Before you build</h3>{result.cautions.map(item => <p key={item}>{item}</p>)}<p>Listing limits and payment rules still follow your store’s plan. Completing this guide does not publish anything.</p>{result.kind === "review" && <Link className={s.secondary} href="/dashboard/vendor/support">Ask Support</Link>}<button className={s.textButton} disabled={pending} onClick={() => run(async () => { await persist(); })}>Save checklist <Check size={15}/></button></aside>
      </div>}
    </section>}
    <footer className={s.footer}><BookOpen size={15}/> Your instructions. Your pace. Free on every plan.<Link href={GUIDE_ROOT}>Guided Creation</Link></footer>
  </div>;
}
function initialIndex(plan: GuidePlan) { const journey = guideJourney(plan.answers); return journey.pending ? journey.questions.length - 1 : journey.questions.length; }
