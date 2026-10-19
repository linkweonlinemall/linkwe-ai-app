"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Clock3, Search, X } from "lucide-react";
import { learningPaths, tutorialCatalog, tutorialCategories, type TutorialName } from "@/lib/vendor/tutorial-catalog";
import { matchingTutorials } from "@/lib/vendor/tutorial-navigation";
import { type TutorialProgress } from "@/lib/vendor/tutorial-progress";
import { animateTutorialElement, cancelTutorialMotion, tutorialMotion } from "@/lib/vendor/tutorial-motion";
import s from "./tutorials.module.css";

export default function TutorialLibrary({ onClose, onStart, progress, storageAvailable }: { onClose: () => void; onStart: (name: TutorialName, resume?: boolean) => void; progress: TutorialProgress; storageAvailable: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All lessons");
  const [view, setView] = useState<"paths" | "all">("paths");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    animateTutorialElement(element, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], tutorialMotion.panel);
    // Wait for the modal to leave the DOM so its former background is no longer inert.
    return () => { cancelTutorialMotion(element); requestAnimationFrame(() => {
      const returnTo = previous?.isConnected && previous !== document.body ? previous : document.querySelector<HTMLElement>('[title="Help & tutorials"]');
      returnTo?.focus({ preventScroll: true });
    }); };
  }, []);
  const completed = Object.values(progress).filter(entry => entry?.complete).length;
  const resume = (Object.entries(progress) as [TutorialName, NonNullable<TutorialProgress[TutorialName]>][]).filter(([, entry]) => !entry.complete).sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0];
  const matches = useMemo(() => matchingTutorials(query, category), [category, query]);
  const searching = Boolean(query.trim()) || category !== "All lessons" || view === "all";
  useEffect(() => {
    // Keep search/input nodes mounted; only soften deliberate view/category changes.
    animateTutorialElement(results.current, [{ opacity: .45, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }]);
  }, [category, searching, view]);
  function leave(after = onClose) {
    if (closing.current) return;
    closing.current = true;
    const element = dialog.current;
    if (!element) { after(); return; }
    element.dataset.leaving = "true";
    const current = getComputedStyle(element);
    const animation = animateTutorialElement(element, [{ opacity: current.opacity, transform: current.transform }, { opacity: 0, transform: "translateY(8px)" }], tutorialMotion.exit);
    if (animation) void animation.finished.then(after, () => {});
    else after();
  }
  function choose(name: TutorialName, resume: boolean) { leave(() => onStart(name, resume)); }
  function card(name: TutorialName) {
    const lesson = tutorialCatalog[name], saved = progress[name];
    return <article key={name} className={s.lesson}>
      <div className={s.lessonTop}><span className={s.lessonIcon}>{saved?.complete ? <Check size={20}/> : <BookOpen size={20}/>}</span><span><Clock3 size={14}/>{lesson.duration}</span></div>
      <small>{lesson.category}</small><h3>{lesson.label}</h3><p>{lesson.description}</p>
      {name === "liveStock" && <span className={s.planBadge}>Active Pro required</span>}
      <div className={s.lessonFooter}><button type="button" onClick={() => choose(name, Boolean(saved))} aria-label={`${saved?.complete ? "Revisit" : saved ? "Continue" : "Start"} ${lesson.label}`}>{saved?.complete ? "Revisit lesson" : saved ? "Continue lesson" : "Learn by doing"}<ArrowRight size={16}/></button><span>{saved ? `${saved.reviewed.length}/${lesson.steps.length} reviewed` : `${lesson.steps.length} steps`}</span></div>
    </article>;
  }
  return <dialog ref={dialog} className={s.library} aria-labelledby="academy-title" onCancel={event => { event.preventDefault(); leave(); }} onClick={event => { if (event.target === event.currentTarget) leave(); }}>
    <div className={s.inner}>
      <header className={s.hero}>
        <button type="button" className={s.close} onClick={() => leave()} aria-label="Close tutorials"><X size={22}/></button>
        <span className={s.brand}><BookOpen size={19}/> LINKWE ACADEMY</span>
        <h2 id="academy-title">Learn it. Try it.<br/><em>Make it yours.</em></h2>
        <p>Practical guidance beside your real workspace. Fill in a form, explore a tool and keep your place as you go.</p>
        <div className={s.progress}><span>{completed} of {Object.keys(tutorialCatalog).length} lessons reviewed</span><progress value={completed} max={Object.keys(tutorialCatalog).length} aria-label="Reviewed lessons"/><small>{storageAvailable ? "Learning progress stays in this browser for this store." : "Browser storage is unavailable. Progress lasts while this page is open."}</small></div>
      </header>
      <div className={s.body}>
        {resume && <button className={s.resumeCard} onClick={() => choose(resume[0], true)}><span><small>PICK UP WHERE YOU LEFT OFF</small><strong>{tutorialCatalog[resume[0]].label}</strong><span>{resume[1].reviewed.length} of {tutorialCatalog[resume[0]].steps.length} steps reviewed</span></span><ArrowRight size={22}/></button>}
        <label className={s.search}><Search size={20}/><input type="search" placeholder="Try ‘product photos’, ‘booking’ or ‘payout’" aria-label="Search tutorials" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear tutorial search"><X size={18}/></button>}</label>
        <div className={s.viewSwitch} role="group" aria-label="Browse tutorials"><button aria-pressed={!searching} onClick={() => { setView("paths"); setCategory("All lessons"); setQuery(""); }}>Learning paths</button><button aria-pressed={searching} onClick={() => setView("all")}>All lessons</button></div>
        <div ref={results}>
        {searching ? <>
          <div className={s.categories} role="group" aria-label="Tutorial categories">{["All lessons", ...tutorialCategories].map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className={s.resultsHeading} role="status"><strong>{query.trim() ? `Results for “${query.trim()}”` : category}</strong><span>{matches.length} {matches.length === 1 ? "lesson" : "lessons"}</span></div>
          <div className={s.grid}>{matches.map(([name]) => card(name))}</div>
          {!matches.length && <div className={s.empty}><Search size={28}/><h3>No matching lessons</h3><p>Try a shorter phrase or a different category.</p><button onClick={() => { setQuery(""); setCategory("All lessons"); }}>Show all lessons</button></div>}
        </> : learningPaths.map((path, index) => <section className={s.path} key={path.title} aria-labelledby={`learning-path-${index}`}><div className={s.pathHeading}><span>{String(index + 1).padStart(2, "0")}</span><div><h3 id={`learning-path-${index}`}>{path.title}</h3><p>{path.description}</p></div></div><div className={s.grid}>{path.lessons.map(card)}</div></section>)}
        </div>
      </div>
      <footer className={s.footer}><span>These are real workspaces. You choose when to save, send, publish or confirm.</span><button type="button" onClick={() => leave()}>Back to workspace <ArrowRight size={16}/></button></footer>
    </div>
  </dialog>;
}
