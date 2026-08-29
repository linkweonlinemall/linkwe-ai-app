"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconCheck, IconChevronDown, IconClock, IconHelpCircle, IconPlayerPlay, IconSparkles, IconX } from "@tabler/icons-react";
import { tutorialCatalog, tutorialCategories, type TutorialName, type TutorialStep } from "@/lib/vendor/tutorial-catalog";

const VERSION = "2026.09";
const WELCOME_SEEN = "linkwe-tour:vendor-welcome-seen";

function visible(selector?: string) {
  if (!selector) return null;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

function targetFor(step: TutorialStep) {
  const el = visible(step.selector);
  if (!el || !step.field) return el;
  return el.closest<HTMLElement>("label") ?? el.closest<HTMLElement>("[data-field]") ?? el.parentElement;
}

export default function VendorGuidedTours() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [welcome, setWelcome] = useState(false);
  const [library, setLibrary] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(tutorialCategories[0]);
  const [tour, setTour] = useState<TutorialName | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [missing, setMissing] = useState(false);
  const activated = useRef("");
  const definition = tour ? tutorialCatalog[tour] : null;
  const steps = definition?.steps ?? [];
  const step = steps[index];

  useEffect(() => {
    if (pathname !== "/dashboard/vendor" || localStorage.getItem(WELCOME_SEEN)) return;
    localStorage.setItem(WELCOME_SEEN, "1");
    const id = window.setTimeout(() => setWelcome(true), 850);
    return () => clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    const open = () => { setWelcome(false); setLibrary(true); };
    addEventListener("vendor-tour:open-library", open);
    return () => removeEventListener("vendor-tour:open-library", open);
  }, []);

  const measure = useCallback(() => {
    if (!step) return;
    setRect(targetFor(step)?.getBoundingClientRect() ?? null);
  }, [step]);

  useEffect(() => {
    if (!tour || !step) return;
    setRect(null); setMissing(false);
    if (step.route && pathname !== step.route) {
      router.push(step.route);
      return;
    }
    if (innerWidth < 768) dispatchEvent(new CustomEvent(step.mobileMore ? "vendor-tour:open-more" : "vendor-tour:close-more"));
    let cancelled = false;
    let attempts = 0;
    let timer = 0;
    const find = () => {
      if (cancelled) return;
      const target = targetFor(step);
      if (target) {
        if (step.navigateSelector && index < steps.length - 1) {
          const destination = visible(step.navigateSelector);
          if (destination) {
            destination.scrollIntoView({ behavior: "smooth", block: "center" });
            timer = window.setTimeout(() => {
              destination.click();
              setIndex((value) => value + 1);
            }, 520);
            return;
          }
        }
        const key = `${tour}:${index}:${step.activateSelector ?? ""}`;
        if (step.activateSelector && activated.current !== key) {
          visible(step.activateSelector)?.click();
          activated.current = key;
          timer = window.setTimeout(find, 180);
          return;
        }
        target.scrollIntoView({ behavior: attempts ? "smooth" : "auto", block: "center", inline: "nearest" });
        timer = window.setTimeout(() => {
          if (!cancelled) { setRect(target.getBoundingClientRect()); setMissing(false); }
        }, 280);
      } else if (++attempts < 8) timer = window.setTimeout(find, 80);
      else if (step.selector && index < steps.length - 1) {
        // Optional/record-specific controls should not stall an otherwise useful tour.
        setIndex((value) => value + 1);
      } else setMissing(Boolean(step.selector));
    };
    timer = window.setTimeout(find, step.mobileMore ? 180 : 30);
    let frame = 0;
    const follow = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    addEventListener("resize", follow); addEventListener("scroll", follow, true);
    return () => {
      cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame);
      removeEventListener("resize", follow); removeEventListener("scroll", follow, true);
    };
  }, [index, measure, pathname, router, step, tour]);

  const close = useCallback((complete = false) => {
    if (complete && tour) localStorage.setItem(`linkwe-tour:${VERSION}:${tour}`, "complete");
    dispatchEvent(new CustomEvent("vendor-tour:close-more"));
    setTour(null); setIndex(0); setRect(null); setMissing(false);
  }, [tour]);

  const spotlight = useMemo(() => {
    if (!rect) return null;
    const left = Math.max(6, rect.left - 8), top = Math.max(6, rect.top - 8);
    const right = Math.min(innerWidth - 6, rect.right + 8), bottom = Math.min(innerHeight - 6, rect.bottom + 8);
    return right > left && bottom > top ? { left, top, width: right-left, height: bottom-top } : null;
  }, [rect]);

  const position = useMemo(() => {
    if (!rect) return "tour-centre";
    if (innerWidth < 768) return rect.top < innerHeight * .52 ? "tour-bottom" : "tour-top";
    return rect.left < innerWidth * .58 ? "tour-right" : "tour-left";
  }, [rect]);
  const waitingForTarget = Boolean(step?.selector && !rect && !missing);

  function start(name: TutorialName) {
    const first = tutorialCatalog[name].steps[0];
    setWelcome(false); setLibrary(false); setIndex(0); setRect(null); setTour(name);
    if (first.route && pathname !== first.route) router.push(first.route);
  }
  function move(next: number) { setRect(null); setMissing(false); setIndex(next); }

  return <>
    <button type="button" onClick={() => setLibrary(true)} className="fixed bottom-[88px] left-3 z-[89] flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3.5 text-xs font-bold text-[#1C1C1A] shadow-[0_12px_34px_rgba(28,28,26,.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[#D4450A] md:bottom-5 md:left-[76px] lg:left-[238px]" aria-label="Open Help and Tutorials">
      <IconHelpCircle className="size-5 text-[#D4450A]"/><span className="hidden sm:inline">Help &amp; Tutorials</span>
    </button>

    {(welcome || library) && <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 p-2.5 backdrop-blur-[4px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[min(92dvh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,.38)] sm:rounded-[30px]">
        <div className="shrink-0 bg-[radial-gradient(circle_at_85%_10%,rgba(240,106,42,.35),transparent_32%),linear-gradient(135deg,#171715,#29251F_60%,#54200D)] px-5 pb-5 pt-5 text-white sm:px-7 sm:pb-7 sm:pt-7">
          <button type="button" onClick={() => {setWelcome(false);setLibrary(false);}} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Close"><IconX className="size-4"/></button>
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F68A3C] to-[#D4450A] shadow-lg"><IconSparkles className="size-5"/></div>
          <h2 className="text-xl font-black tracking-tight sm:text-[28px]">{library ? "LinkWe Vendor Academy" : "Welcome to LinkWe"}</h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/70 sm:text-sm sm:leading-6">{library ? "Open a guided workflow whenever you need help. Each tutorial takes you into the real panel and explains what to do, when to do it and what to check." : "Learn how to set up, sell and run your business. This welcome appears only once; every tutorial remains in Help & Tutorials."}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#FBFAF8] p-3 sm:p-5">
          {tutorialCategories.map(category => {
            const items = (Object.entries(tutorialCatalog) as Array<[TutorialName, (typeof tutorialCatalog)[TutorialName]]>).filter(([,d]) => d.category === category);
            const open = expanded === category;
            return <section key={category} className="mb-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <button type="button" onClick={() => setExpanded(open ? null : category)} className="flex w-full items-center justify-between gap-3 p-3.5 text-left sm:p-4"><span><span className="block text-sm font-black">{category}</span><span className="text-[10px] text-zinc-500">{items.length} guided tutorials</span></span><IconChevronDown className={`size-5 text-zinc-400 transition ${open?"rotate-180":""}`}/></button>
              {open && <div className="grid grid-cols-1 gap-2 border-t border-zinc-100 p-2.5 sm:grid-cols-2 sm:p-3">{items.map(([name,item]) => {
                const done = typeof window !== "undefined" && localStorage.getItem(`linkwe-tour:${VERSION}:${name}`) === "complete";
                return <button key={name} type="button" onClick={() => start(name)} className="group flex min-h-[86px] items-center gap-3 rounded-2xl border border-zinc-200 bg-[#FAF8F5] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#D4450A]/35 hover:bg-[#FFF5EF] hover:shadow-md">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#D4450A] text-white">{done?<IconCheck className="size-5"/>:<IconPlayerPlay className="size-4"/>}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{item.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{item.description}</span><span className="mt-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[#D4450A]"><span>{item.steps.length} steps</span><span className="inline-flex items-center gap-0.5 text-zinc-400"><IconClock className="size-3"/>{item.duration}</span></span></span>
                  <IconArrowRight className="size-4 shrink-0 text-zinc-300 group-hover:text-[#D4450A]"/>
                </button>;
              })}</div>}
            </section>;
          })}
          {welcome && <button type="button" onClick={() => setWelcome(false)} className="mt-2 w-full py-2.5 text-xs font-bold text-zinc-500">Explore on my own</button>}
        </div>
      </div>
    </div>}

    {tour && definition && step && <div className="pointer-events-none fixed inset-0 z-[300] animate-[tour-layer-in_700ms_cubic-bezier(.22,1,.36,1)_both]" role="dialog" aria-modal="true">
      {spotlight ? <div className="pointer-events-none fixed rounded-[18px] border-2 border-[#FF7A3D] shadow-[0_0_0_9999px_rgba(10,10,9,.68),0_0_0_6px_rgba(212,69,10,.20),0_16px_45px_rgba(0,0,0,.22)] transition-[left,top,width,height,opacity] duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={spotlight}/> : <div className="pointer-events-none fixed inset-0 bg-black/68 backdrop-blur-[2px]"/>}
      {waitingForTarget ? <div className="tour-target-loader fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-full border border-white/15 bg-[#171715]/92 py-2 pl-2 pr-4 text-white shadow-2xl backdrop-blur-xl"><span className="relative flex size-9 items-center justify-center"><span className="absolute inset-0 animate-spin rounded-full border-2 border-white/15 border-t-[#F27B42]"/><img src="/icon.png" alt="" className="size-7 rounded-full object-cover"/></span><span><span className="block text-[11px] font-bold">Finding the next control</span><span className="block text-[9px] text-white/50">Just a moment</span></span></div> : <div className={`tour-coach pointer-events-auto fixed overflow-hidden rounded-[20px] border border-white/80 bg-white/95 shadow-[0_22px_70px_rgba(0,0,0,.34)] backdrop-blur-xl ${position}`}>
        <div className="h-1 bg-gradient-to-r from-[#D4450A] via-[#F27B42] to-[#F2A20C]"/><div key={`${tour}-${index}`} className="tour-explanation p-3.5 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2"><div className="min-w-0"><span className="block truncate text-[9px] font-black uppercase tracking-[.15em] text-[#D4450A]">{definition.label}</span><span className="text-[9px] font-bold text-zinc-400">Step {index+1} of {steps.length}</span></div><button type="button" onClick={() => close(false)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100" aria-label="Exit tutorial"><IconX className="size-4"/></button></div>
          <h3 className="text-[15px] font-black leading-5 tracking-tight sm:text-xl sm:leading-tight">{step.title}</h3><p className="mt-1.5 text-[11px] leading-[17px] text-zinc-600 sm:mt-2 sm:text-sm sm:leading-6">{step.body}</p>
          {step.note && <div className="mt-2 rounded-xl bg-[#FFF3EC] px-3 py-2 text-[10px] leading-4 text-[#8D3511]"><strong>Why this matters:</strong> {step.note}</div>}
          {missing && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[9px] leading-4 text-amber-800">This final control is not available on the current account yet.</p>}
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-gradient-to-r from-[#D4450A] to-[#F28A2D] transition-all duration-500" style={{width:`${((index+1)/steps.length)*100}%`}}/></div>
          <div className="mt-3 flex items-center justify-between gap-2"><button type="button" disabled={!index} onClick={() => move(index-1)} className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-[11px] font-bold text-zinc-500 disabled:opacity-25"><IconArrowLeft className="size-4"/>Back</button>{index===steps.length-1?<button type="button" onClick={() => close(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#D4450A] px-4 text-[11px] font-bold text-white"><IconCheck className="size-4"/>Finish</button>:<button type="button" onClick={() => move(index+1)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1C1C1A] px-4 text-[11px] font-bold text-white">Next<IconArrowRight className="size-4"/></button>}</div>
        </div>
      </div>}
      <style jsx>{`
        @keyframes tour-layer-in{from{opacity:0}to{opacity:1}}@keyframes tour-coach-in{from{opacity:0;scale:.94;filter:blur(5px)}to{opacity:1;scale:1;filter:blur(0)}}@keyframes tour-explanation-in{from{opacity:0;transform:translateY(9px);filter:blur(2px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
        .tour-target-loader{animation:tour-coach-in 500ms cubic-bezier(.22,1,.36,1) both}.tour-target-loader img{animation:tour-logo-breathe 1.5s ease-in-out infinite}@keyframes tour-logo-breathe{50%{transform:scale(1.08);filter:brightness(1.12)}}.tour-coach{left:10px;right:10px;width:auto;max-height:min(42dvh,360px);overflow-y:auto;animation:tour-coach-in 850ms cubic-bezier(.22,1,.36,1) both;transition:top 750ms cubic-bezier(.22,1,.36,1),bottom 750ms cubic-bezier(.22,1,.36,1),left 750ms cubic-bezier(.22,1,.36,1),right 750ms cubic-bezier(.22,1,.36,1)}.tour-explanation{animation:tour-explanation-in 560ms cubic-bezier(.22,1,.36,1) both}.tour-bottom{bottom:calc(78px + env(safe-area-inset-bottom,0px))}.tour-top{top:calc(8px + env(safe-area-inset-top,0px))}.tour-centre{top:50%;transform:translateY(-50%)}
        @media(prefers-reduced-motion:reduce){.tour-coach,.tour-explanation{animation-duration:1ms!important;transition-duration:1ms!important}}
        @media(min-width:768px){.tour-coach{left:auto;right:auto;top:50%;bottom:auto;width:360px;max-height:min(76dvh,620px);transform:translateY(-50%)}.tour-right{right:24px}.tour-left{left:24px}.tour-centre{left:50%;transform:translate(-50%,-50%)}}
      `}</style>
    </div>}
  </>;
}
