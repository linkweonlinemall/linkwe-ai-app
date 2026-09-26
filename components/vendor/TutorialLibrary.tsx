"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Clock3, Play, Search, X } from "lucide-react";
import { tutorialCatalog, tutorialCategories, type TutorialName } from "@/lib/vendor/tutorial-catalog";
import { readTutorialProgress, type TutorialProgress } from "@/lib/vendor/tutorial-progress";
import s from "./tutorials.module.css";

const lessons = Object.entries(tutorialCatalog) as Array<[TutorialName, (typeof tutorialCatalog)[TutorialName]]>;

export default function TutorialLibrary({ welcome, onClose, onStart }: { welcome: boolean; onClose: () => void; onStart: (name: TutorialName, resume?: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All lessons");
  const [progress] = useState<TutorialProgress>(readTutorialProgress);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const completed = lessons.filter(([name]) => progress[name]?.complete).length;
  const matches = useMemo(() => lessons.filter(([, lesson]) => (category === "All lessons" || lesson.category === category) && `${lesson.label} ${lesson.description} ${lesson.steps.map(step => `${step.title} ${step.body}`).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())), [category, query]);
  return <dialog ref={dialog} className={s.library} aria-labelledby="academy-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={s.inner}>
      <header className={s.hero}>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close tutorials"><X size={20}/></button>
        <span className={s.brand}><BookOpen size={18}/> LINKWE ACADEMY</span>
        <h2 id="academy-title">{welcome ? "Your business starts here." : "A little guidance. A lot of possibility."}</h2>
        <p>Learn at your own pace, right inside your workspace. Pick a task, follow the steps, and come back whenever you need.</p>
        <div className={s.progress}><span>{completed} of {lessons.length} lessons explored</span><progress value={completed} max={lessons.length} aria-label="Completed tutorials"/><small>Progress is saved in this browser.</small></div>
      </header>
      <div className={s.body}>
        {welcome && <button className={s.startHere} onClick={() => onStart("essentials")}><span><small>NEW TO LINKWE?</small><strong>Take a quick look around</strong><span>Your store, daily work and where to find everything.</span></span><ArrowRight size={22}/></button>}
        <label className={s.search}><Search size={19}/><input autoFocus placeholder="What would you like to learn?" aria-label="Search tutorials" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear tutorial search"><X size={17}/></button>}</label>
        <div className={s.categories} role="group" aria-label="Tutorial categories">{["All lessons", ...tutorialCategories].map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <div className={s.resultsHeading}><strong>{query ? `Results for “${query}”` : category}</strong><span>{matches.length} lessons</span></div>
        <div className={s.grid}>{matches.map(([name, lesson]) => {
          const saved = progress[name];
          const resume = Boolean(saved && !saved.complete && saved.step > 0);
          return <article key={name} className={s.lesson}>
            <div className={s.lessonTop}><span className={s.lessonIcon}>{saved?.complete ? <Check size={20}/> : <Play size={18}/>}</span><span><Clock3 size={12}/>{lesson.duration}</span></div>
            <small>{lesson.category}</small><h3>{lesson.label}</h3><p>{lesson.description}</p>
            <div className={s.lessonFooter}><button type="button" onClick={() => onStart(name, resume)}>{saved?.complete ? "Revisit lesson" : resume ? `Resume at step ${saved!.step + 1}` : "Start lesson"}<ArrowRight size={15}/></button><span>{lesson.steps.length} steps</span></div>
            {resume && <button type="button" className={s.restart} onClick={() => onStart(name)}>Start again</button>}
          </article>;
        })}</div>
        {!matches.length && <div className={s.empty}><Search size={26}/><h3>No lessons found</h3><p>Try “photos”, “booking”, “payout” or another task.</p><button onClick={() => { setQuery(""); setCategory("All lessons"); }}>Show all lessons</button></div>}
      </div>
      <footer className={s.footer}><span>Guided lessons explain each step. You choose when to save or publish.</span><button type="button" onClick={onClose}>Back to my workspace <ArrowRight size={15}/></button></footer>
    </div>
  </dialog>;
}
