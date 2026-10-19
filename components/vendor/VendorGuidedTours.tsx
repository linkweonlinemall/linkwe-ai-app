"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Compass, LocateFixed, X } from "lucide-react";
import { tutorialCatalog, type TutorialName } from "@/lib/vendor/tutorial-catalog";
import { isTutorialName, readActiveTutorial, readTutorialProgress, saveActiveTutorial, saveTutorialProgress, type ActiveTutorial, type TutorialProgress } from "@/lib/vendor/tutorial-progress";
import { tutorialDestination, tutorialPageAllowsTarget, tutorialRouteMatches } from "@/lib/vendor/tutorial-navigation";
import { animateTutorialElement, cancelTutorialMotion, tutorialMotion } from "@/lib/vendor/tutorial-motion";
import TutorialLibrary from "./TutorialLibrary";
import s from "./guided-coach.module.css";
import "./tutorial-layout.css";

function visibleTarget(selector: string, container: ParentNode = document): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).find(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && !element.closest('[hidden], [inert], [aria-hidden="true"]') && getComputedStyle(element).visibility !== "hidden";
  });
}

export default function VendorGuidedTours({ storeId }: { storeId: string }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const route = `${pathname}${params.size ? `?${params.toString()}` : ""}`;
  const [library, setLibrary] = useState(false);
  const [active, setActive] = useState<ActiveTutorial | null>(null);
  const [progress, setProgress] = useState<TutorialProgress>({});
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [found, setFound] = useState(false);
  const [finished, setFinished] = useState(false);
  const [navigation, setNavigation] = useState(false);
  const panel = useRef<HTMLElement>(null), heading = useRef<HTMLHeadingElement>(null), content = useRef<HTMLDivElement>(null);
  const beforePanel = useRef<{ rect: DOMRect; host: HTMLElement | null } | null>(null);
  const seenPanel = useRef<HTMLElement | null>(null);
  const panelTransition = useRef<Animation | null>(null);
  const resumeButton = useRef<HTMLButtonElement>(null);
  const explanation = useRef<HTMLDivElement>(null);
  const locateFrame = useRef(0);
  const highlighted = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const target = useRef<HTMLElement | undefined>(undefined);
  const activeName = active?.name, minimized = active?.minimized;
  const definition = active ? tutorialCatalog[active.name] : null;
  const index = definition ? Math.max(0, definition.steps.findIndex(step => step.id === active?.stepId)) : 0;
  const step = definition?.steps[index];
  const destination = active ? tutorialDestination(active.name, index) : "";
  const sameDestination = active ? tutorialRouteMatches(route, destination) : false;
  const reviewed = active ? progress[active.name]?.reviewed ?? [] : [];
  const inDialog = portal?.tagName === "DIALOG";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
    setProgress(readTutorialProgress(storeId));
    setActive(readActiveTutorial(storeId));
    // Probe this scoped key, without touching any form or account data.
    try { const key = `linkwe-academy:storage-check:${storeId}`; localStorage.setItem(key, "1"); localStorage.removeItem(key); }
    catch { setStorageAvailable(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [storeId]);

  const persist = useCallback((next: ActiveTutorial | null) => {
    const element = panel.current;
    beforePanel.current = element ? { rect: element.getBoundingClientRect(), host: element.parentElement } : null;
    cancelTutorialMotion(element);
    setActive(next);
    saveActiveTutorial(storeId, next);
  }, [storeId]);

  const start = useCallback((name: TutorialName, resume = false) => {
    if (!isTutorialName(name)) return;
    const focused = document.activeElement as HTMLElement | null;
    if (focused && focused !== document.body && !focused.closest("dialog")) trigger.current = focused;
    const saved = progress[name];
    const stepId = resume && saved && !saved.complete ? saved.stepId : tutorialCatalog[name].steps[0].id;
    const next = { ...progress, [name]: { stepId, reviewed: saved?.reviewed ?? [], complete: saved?.complete ?? false, updatedAt: Date.now() } };
    setProgress(next);
    setStorageAvailable(saveTutorialProgress(storeId, next));
    persist({ name, stepId, minimized: false });
    setLibrary(false); setFinished(false); setNavigation(false);
    dispatchEvent(new CustomEvent("vendor-guide:started"));
    // Starting guidance never navigates away from an unfinished form.
  }, [persist, progress, storeId]);

  useEffect(() => {
    const open = () => {
      trigger.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement : visibleTarget('[title="Help & tutorials"]') ?? null;
      setLibrary(true);
    };
    const launch = (event: Event) => { const name: unknown = (event as CustomEvent).detail; if (isTutorialName(name)) start(name, true); };
    addEventListener("vendor-tour:open-library", open); addEventListener("vendor-tour:start", launch);
    return () => { removeEventListener("vendor-tour:open-library", open); removeEventListener("vendor-tour:start", launch); };
  }, [start]);

  // Observe the actual rendered target, including sections revealed by the user.
  // No click(), form mutation or navigation is allowed in this effect.
  useEffect(() => {
    if (!active || !step || library) return;
    let frame = 0;
    const measure = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]"));
      const host = dialogs.at(-1) ?? document.body;
      setPortal(host);
      const element = tutorialPageAllowsTarget(route, active.name, index) ? visibleTarget(step.selector, host instanceof HTMLDialogElement ? host : document) : undefined;
      target.current = element;
      setFound(Boolean(element));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "hidden", "aria-expanded", "class"] });
    addEventListener("resize", schedule); schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); removeEventListener("resize", schedule); target.current = undefined; };
  }, [active, index, library, route, step]);

  useEffect(() => {
    if (!active || library) return;
    document.documentElement.dataset.vendorLesson = active.minimized ? "compact" : "expanded";
    const element = panel.current;
    const measure = () => document.documentElement.style.setProperty("--vendor-lesson-height", `${element?.getBoundingClientRect().height ?? 100}px`);
    const observer = new ResizeObserver(measure);
    if (element) observer.observe(element);
    measure();
    return () => { observer.disconnect(); delete document.documentElement.dataset.vendorLesson; document.documentElement.style.removeProperty("--vendor-lesson-height"); };
  }, [active, library, portal]);

  useLayoutEffect(() => {
    const element = panel.current;
    const before = beforePanel.current;
    beforePanel.current = null;
    panelTransition.current = null;
    if (!element) { seenPanel.current = null; return; }
    const isNew = seenPanel.current !== element;
    seenPanel.current = element;
    if (before && before.host === element.parentElement) {
      const next = element.getBoundingClientRect();
      const dx = before.rect.left - next.left, dy = before.rect.top - next.top;
      if (Math.abs(dy) + Math.abs(dx) + Math.abs(before.rect.height - next.height) > 1) {
        // Animate the panel's geometry, never scale text or remount the workspace.
        panelTransition.current = animateTutorialElement(element, [
          { height: `${before.rect.height}px`, width: `${before.rect.width}px`, transform: `translate(${dx}px, ${dy}px)` },
          { height: `${next.height}px`, width: `${next.width}px`, transform: "translate(0, 0)" },
        ], tutorialMotion.panel);
      }
    } else if (isNew) {
      animateTutorialElement(element, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], tutorialMotion.panel);
    }
  }, [activeName, active?.stepId, minimized, finished, library, portal]);

  useEffect(() => {
    animateTutorialElement(explanation.current, [{ opacity: .45, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }]);
  }, [activeName, active?.stepId, finished, minimized, library, portal]);

  useEffect(() => () => {
    cancelAnimationFrame(locateFrame.current);
    cancelTutorialMotion(seenPanel.current);
    cancelTutorialMotion(highlighted.current);
  }, []);

  useEffect(() => {
    if (!activeName || minimized || library || !portal) return;
    const frame = requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [activeName, minimized, library, portal]);

  useEffect(() => {
    if (content.current) content.current.scrollTop = 0;
  }, [activeName, active?.stepId, finished]);

  function pause() {
    const element = panel.current;
    const finish = () => {
      persist(null); setFinished(false); setNavigation(false);
      const returnTo = trigger.current?.isConnected && !element?.contains(trigger.current)
        ? trigger.current : visibleTarget('[title="Help & tutorials"]');
      returnTo?.focus({ preventScroll: true });
    };
    const current = element && getComputedStyle(element);
    const animation = animateTutorialElement(element, [{ opacity: current?.opacity ?? 1, transform: current?.transform ?? "none" }, { opacity: 0, transform: "translateY(8px)" }], tutorialMotion.exit);
    if (animation) void animation.finished.then(finish, () => {});
    else finish();
  }
  function move(nextIndex: number, markReviewed = false) {
    if (!active || !definition || !step) return;
    const nextStep = definition.steps[Math.max(0, Math.min(nextIndex, definition.steps.length - 1))];
    const checked = markReviewed ? [...new Set([...reviewed, step.id])] : reviewed;
    const next = { ...progress, [active.name]: { stepId: nextStep.id, reviewed: checked, complete: checked.length === definition.steps.length, updatedAt: Date.now() } };
    setProgress(next); setStorageAvailable(saveTutorialProgress(storeId, next));
    persist({ ...active, stepId: nextStep.id, minimized: false }); setNavigation(false);
    setFinished(markReviewed && nextIndex >= definition.steps.length);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function minimize() {
    if (!active) return;
    persist({ ...active, minimized: true });
    requestAnimationFrame(() => resumeButton.current?.focus({ preventScroll: true }));
  }
  function locate() {
    const element = target.current;
    if (!element || !active) return;
    // Give forms the screen on small displays while keeping a visible resume bar.
    if (inDialog || matchMedia("(max-width: 1199px)").matches) persist({ ...active, minimized: true });
    const focus = element.matches('input:not([type="hidden"]), textarea, select, button, a[href], [tabindex], [contenteditable="true"]') ? element : visibleTarget('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"], summary', element) ?? element;
    const oldTabIndex = focus.getAttribute("tabindex");
    if (oldTabIndex === null && focus === element) focus.setAttribute("tabindex", "-1");
    focus.focus({ preventScroll: true });
    cancelAnimationFrame(locateFrame.current);
    cancelTutorialMotion(highlighted.current);
    highlighted.current = element;
    // Let the compact layout settle first; move only as far as the real field needs.
    locateFrame.current = requestAnimationFrame(() => {
      const reveal = () => {
        if (!focus.isConnected || document.activeElement !== focus) return;
        focus.scrollIntoView({ block: "nearest", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        animateTutorialElement(element, [{ outline: "3px solid #D4450A", outlineOffset: "3px" }, { outline: "3px solid transparent", outlineOffset: "5px" }], 1100);
      };
      if (panelTransition.current) void panelTransition.current.finished.then(reveal, () => {});
      else reveal();
    });
    if (oldTabIndex === null && focus === element) focus.addEventListener("blur", () => focus.removeAttribute("tabindex"), { once: true });
  }

  return <>
    {library && <TutorialLibrary onClose={() => setLibrary(false)} onStart={start} progress={progress} storageAvailable={storageAvailable}/>}
    {active && definition && step && portal && !library && createPortal(<aside ref={panel} className={`${s.coach} ${active.minimized ? s.compact : ""} ${inDialog ? s.inDialog : ""}`} aria-label={`${definition.label} guided lesson`} onKeyDown={event => { if (event.key === "Escape" && !inDialog) { event.preventDefault(); pause(); } }}>
      <header className={s.header}><span><Compass size={18}/> LINKWE · LEARN BY DOING</span><button type="button" onClick={pause} aria-label="Pause and close lesson"><X size={20}/></button></header>
      {active.minimized ? <button ref={resumeButton} type="button" className={s.resume} onClick={() => persist({ ...active, minimized: false })}><span><small>STEP {index + 1} OF {definition.steps.length}</small><strong>{step.title}</strong></span><span>Guide <BookOpen size={18}/></span></button> : <>
        <div className={s.meta}><button type="button" onClick={() => setLibrary(true)}><ArrowLeft size={14}/> All lessons</button><span>{reviewed.length}/{definition.steps.length} reviewed</span></div>
        <progress max={definition.steps.length} value={reviewed.length} aria-label="Reviewed lesson steps"/>
        <div ref={content} className={s.scroll}>
          <p className={s.lessonName}>{definition.label}</p>
          {finished ? <div ref={explanation} className={s.explanation}><h2 ref={heading} tabIndex={-1}>{reviewed.length === definition.steps.length ? "Lesson reviewed." : "Keep your place. Come back anytime."}</h2><p>{definition.outcome}</p><p>{reviewed.length === definition.steps.length ? "You have reviewed every step. Check the real workspace for the result of any actions you took." : `${definition.steps.length - reviewed.length} steps still need your review. You can return to them below.`}</p><button className={s.primary} onClick={() => { setFinished(false); move(Math.max(0, definition.steps.findIndex(item => !reviewed.includes(item.id)))); }}>Review steps <ArrowRight size={16}/></button></div> : <div ref={explanation} className={s.explanation}>
            <span className={s.eyebrow}>STEP {index + 1} · {step.where}</span><h2 ref={heading} tabIndex={-1}>{step.title}</h2><p>{step.body}</p>
            {step.note && <p className={s.note}>{step.note}</p>}
            <div className={s.work}>
              {found ? <button type="button" className={s.primary} onClick={locate}><LocateFixed size={17}/> Work on this step <ArrowRight size={16}/></button> : <>
                <p className={s.missing}>{sameDestination || step.within && pathname.startsWith(step.within) ? step.fallback : `This step is in ${step.where}. Open the matching workspace when you are ready.`}</p>
                {!sameDestination && !found && !(step.within && pathname.startsWith(step.within)) && <button type="button" className={s.primary} onClick={() => setNavigation(true)}>Open {step.route ? step.where : definition.workspace}<ArrowRight size={16}/></button>}
              </>}
              {navigation && <div className={s.navigation} role="group" aria-label="Leave this workspace"><p>Save any unfinished form first. Opening this destination can discard unsaved entries. Your lesson position will stay.</p><code>{destination}</code><div><button type="button" onClick={() => { setNavigation(false); router.push(destination); }}>Open workspace</button><button type="button" onClick={() => setNavigation(false)}>Stay here</button></div></div>}
            </div>
            <div className={s.check}><Check size={17}/><p><strong>Check before moving on</strong>{step.check}</p></div>
            <details className={s.details}><summary>Before you start & plan access</summary><p>{definition.prepare}</p><p>{definition.access}</p></details>
            <details className={s.details}><summary>Something missing or not saving?</summary><p>{step.fallback}</p><p>{definition.troubleshooting}</p></details>
          </div>}
        </div>
        <div className={s.actions}>
          {!finished && <><div className={s.stepActions}><button type="button" disabled={index === 0} onClick={() => move(index - 1)} aria-label="Previous lesson step"><ArrowLeft size={18}/></button><button type="button" className={s.primary} onClick={() => move(index + 1, true)}>{index === definition.steps.length - 1 ? "Reviewed · Finish" : "Reviewed · Next"}<Check size={16}/></button><button type="button" disabled={index === definition.steps.length - 1} onClick={() => move(index + 1)} aria-label="Skip to next step"><ArrowRight size={18}/></button></div></>}
          <label className={s.stepPicker}>Jump to a step<select value={index} onChange={event => { setFinished(false); move(Number(event.target.value)); }}>{definition.steps.map((item, i) => <option key={item.id} value={i}>{reviewed.includes(item.id) ? "✓ " : ""}{i + 1}. {item.title}</option>)}</select></label>
          <div className={s.bottom}><button type="button" onClick={minimize}><ChevronDown size={17}/> Minimize guide</button><span role="status">{storageAvailable ? "Learning progress saved" : "Progress is not saved in this browser"}</span></div>
          <p className={s.saved}>Form entries save separately. You control every real action.</p>
        </div>
      </>}
    </aside>, portal)}
  </>;
}
