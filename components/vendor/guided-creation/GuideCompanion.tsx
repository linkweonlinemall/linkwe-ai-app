"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Compass, ListChecks, X } from "lucide-react";
import { getCreationGuide, saveCreationGuide } from "@/app/actions/guided-creation";
import { GUIDE_ROOT, guideJourney, TYPE_GUIDANCE, type GuidePlan } from "@/lib/vendor/guided-creation/model";
import GuideChecklist from "./GuideChecklist";
import s from "./guide.module.css";

const GuideContext = createContext<{ plan: GuidePlan | null; setPlan: (plan: GuidePlan) => void; error: string; loading: boolean; id: string } | null>(null);
export function GuideProvider({ children }: { children: ReactNode }) {
  const id = useSearchParams().get("guide");
  return id ? <SavedGuide key={id} id={id}>{children}</SavedGuide> : children;
}
function SavedGuide({ id, children }: { id: string; children: ReactNode }) {
  const [plan, setPlan] = useState<GuidePlan | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; getCreationGuide(id).then(value => { if (active) setPlan(value); }).catch(() => { if (active) setError("This guide is unavailable. Your form can still be completed manually."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  return <GuideContext.Provider value={{ plan, setPlan, error, loading, id }}>{children}</GuideContext.Provider>;
}
export function GuideCompanion({ editor = false, sections = [] }: { editor?: boolean; sections?: { id: string; label: string }[] }) {
  const guide = useContext(GuideContext), [pending, start] = useTransition(), [error, setError] = useState("");
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  if (!guide) return null;
  const result = guide.plan ? guideJourney(guide.plan.answers).result : null;
  const currentGuide = guide;
  function saveChecks(checked: string[]) {
    if (!currentGuide.plan || saving.current) return;
    saving.current = true;
    setError("");
    start(async () => {
      try {
        const plan = currentGuide.plan!;
        currentGuide.setPlan(await saveCreationGuide({ id: plan.id, version: plan.version, title: plan.title, answers: plan.answers, checked }));
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save checklist. Try again."); }
      finally { saving.current = false; }
    });
  }
  function jumpTo(id: string) {
    mobileDialog.current?.close();
    const section = document.getElementById(id);
    if (!section) return;
    const heading = section.querySelector<HTMLElement>("h2, h3") ?? section;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  const retry = error && <div className={s.guideSaveError} role="alert"><p>{error}</p><button type="button" disabled={pending} onClick={() => start(async () => { try { currentGuide.setPlan(await getCreationGuide(currentGuide.id)); setError(""); } catch { setError("Could not reload this guide."); } })}>Reload checklist</button></div>;
  const completed = guide.plan?.checked.length ?? 0;
  const nextStep = result?.steps.find(step => !guide.plan?.checked.includes(step.id));
  function panel(mobile = false) {
    return <>
      <header className={s.buildGuideHeader}><span className={s.buildGuideIcon}><ListChecks size={23}/></span><div><p>BUILD WITH YOUR GUIDE</p><h2>Your build checklist</h2></div>{mobile && <button type="button" aria-label="Close checklist" onClick={() => mobileDialog.current?.close()}><X size={20}/></button>}</header>
      {currentGuide.loading ? <p className={s.guideEmpty} role="status">Opening your saved checklist…</p> : currentGuide.error ? <p className={s.guideEmpty} role="alert">{currentGuide.error}</p> : result && currentGuide.plan ? <>
        <div className={s.buildGuideProgress}><strong>{currentGuide.plan.title}</strong><p><span>{completed} of {result.steps.length} complete</span><span role="status">{pending ? "Saving…" : error ? "Not saved" : "Saved"}</span></p><progress value={completed} max={result.steps.length} aria-label="Checklist completion"/><small>Go to a section, fill it in, then tick it off here.</small></div>
        {retry}
        <ol className={s.buildGuideSteps}>{result.steps.map((step, index) => {
          const done = currentGuide.plan!.checked.includes(step.id);
          const destinations = guideSections(result.kind, step.id, sections);
          return <li key={step.id} data-current={nextStep?.id === step.id} data-done={done}>
            <label><input type="checkbox" checked={done} disabled={pending} aria-label={`Mark step ${index + 1} complete: ${step.title}`} onChange={event => saveChecks(event.target.checked ? [...currentGuide.plan!.checked, step.id] : currentGuide.plan!.checked.filter(id => id !== step.id))}/><span><small>STEP {index + 1}{nextStep?.id === step.id ? " · UP NEXT" : done ? " · DONE" : ""}</small><strong>{step.title}</strong></span></label>
            <p>{step.detail}</p>
            {!!destinations.length && <div className={s.guideSectionLinks}>{destinations.map(section => <button type="button" key={section.id} onClick={() => jumpTo(section.id)}>{section.label}<ArrowRight size={13}/></button>)}</div>}
          </li>;
        })}</ol>
        {completed === result.steps.length && <p className={s.guideComplete}><Check size={18}/> All steps checked. Review your listing, then save or publish through the form.</p>}
      </> : <p className={s.guideEmpty}>Finish your questions to get a setup checklist.</p>}
      <footer className={s.buildGuideFooter}><p>Ticks save automatically. Save your product or listing separately when you are ready.</p><Link href={`${GUIDE_ROOT}?guide=${encodeURIComponent(currentGuide.id)}`} target="_blank" rel="noopener noreferrer">Review my answers ↗</Link></footer>
    </>;
  }
  if (editor) return <>
    <section className={s.desktopGuide} aria-label="Build checklist">{panel()}</section>
    <button type="button" className={s.mobileGuideTrigger} aria-haspopup="dialog" onClick={() => mobileDialog.current?.showModal()}><ListChecks size={21}/><span><strong>Your checklist</strong><small>{result ? `${completed} of ${result.steps.length} complete · ${nextStep ? "Keep building" : "Ready to review"}` : "View your saved guide"}</small></span><span className={s.mobileGuideCount}>{result ? `${completed}/${result.steps.length}` : "Open"}</span></button>
    <dialog ref={mobileDialog} className={s.mobileGuideDialog} aria-label="Your build checklist" onClick={event => { if (event.target === event.currentTarget) mobileDialog.current?.close(); }}><div>{panel(true)}</div></dialog>
  </>;
  return <div className={s.companion}>
    {guide.loading ? <p role="status">Opening your saved checklist…</p> : <details open><summary><Compass size={16} style={{ display: "inline", marginRight: 6 }}/>Your creation guide</summary>
      {guide.error ? <p role="alert">{guide.error}</p> : result && guide.plan ? <><p><strong>{result.title}</strong><br/>{result.reason}</p><GuideChecklist compact result={result} checked={guide.plan.checked} disabled={pending} onChange={checked => { setError(""); start(async () => { try { const plan = guide.plan!; guide.setPlan(await saveCreationGuide({ id: plan.id, version: plan.version, title: plan.title, answers: plan.answers, checked })); } catch (e) { setError(e instanceof Error ? e.message : "Could not save checklist."); } }); }}/><p>Checklist ticks save separately. Save your listing through its form.</p></> : <p>Finish your questions to get a setup checklist.</p>}
      {error && <div role="alert"><p>{error}</p><button className={s.textButton} disabled={pending} onClick={() => start(async () => { try { guide.setPlan(await getCreationGuide(guide.id)); setError(""); } catch { setError("Could not reload this guide."); } })}>Reload checklist</button></div>}
      <Link href={`${GUIDE_ROOT}?guide=${encodeURIComponent(guide.id)}`} target="_blank" rel="noopener noreferrer">Open full guide ↗</Link>
    </details>}
  </div>;
}

function guideSections(kind: string, step: string, sections: { id: string; label: string }[]) {
  const product: Record<string, string[]> = { type: ["Product Type"], details: ["Product Details", "Images"], options: ["Product Variants", "Pricing & Inventory"], stock: ["Pricing & Inventory"], file: ["Digital file", "Pricing & Inventory"], personal: ["Checkout questions"], delivery: ["Shipping", "Location"], review: ["Save or publish"] };
  const service: Record<string, string[]> = { type: ["Service type"], details: ["Basic information", "Service images"], expectations: ["Basic information"], schedule: ["Duration", "Pricing"], location: ["Where does this service happen?"], virtual: ["Virtual session details"], quote: ["Pricing"], brief: ["Quote details"], recurring: ["Subscription details", "Pricing"], terms: ["Subscription details"], callout: ["On-demand details"], payment: ["Payment preference"], review: ["Visibility", "Save or publish"] };
  const event: Record<string, string[]> = { event: ["Basic details", "Location", "Cover image"], capacity: ["Settings"], review: ["Save or publish"] };
  const labels = (kind === "product" ? product : kind === "service" ? service : event)[step] ?? [];
  return labels.flatMap(label => sections.filter(section => section.label === label));
}
export function ListingTypeHelp({ kind, selected }: { kind: "product" | "service" | "event"; selected?: string }) {
  const guide = useContext(GuideContext);
  const result = guide?.plan ? guideJourney(guide.plan.answers).result : null;
  const expected = kind === "product" ? result?.productType : result?.workflow;
  const mismatch = result && result.kind !== "review" && (result.kind !== kind && !(kind === "event" && result.kind === "ticket") || !!selected && !!expected && expected !== selected);
  return <div className={s.basic}>
    <details><summary>Am I using the right listing type?</summary><dl>{TYPE_GUIDANCE.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl><Link href={GUIDE_ROOT} target="_blank" rel="noopener noreferrer">Help me choose · Free guide <ArrowRight size={14}/></Link></details>
    {mismatch && <p className={s.mismatch} role="status">Your guide recommends <strong>{result.title}</strong>. This form selection differs. Check your answers or confirm that this is the setup you want before saving.</p>}
  </div>;
}
export function GuideEntry() { return <Link href={GUIDE_ROOT} className={s.entry}><Compass size={30}/><span><strong>Not sure how to set it up?</strong><small>Answer a few questions and get a manual build checklist. Free for every vendor.</small></span><ArrowRight size={20}/></Link>; }
