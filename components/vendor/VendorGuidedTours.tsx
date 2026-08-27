"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconCheck, IconHelpCircle, IconPlayerPlay, IconSparkles, IconX } from "@tabler/icons-react";

type TourName = "essentials" | "product";
type Step = { title: string; body: string; selector?: string; mobileMore?: boolean };
const VERSION = "2026.08";

const essentials: Step[] = [
  { title: "Welcome to your vendor dashboard", body: "This is your business control centre. Let’s take a quick tour so you always know what to do next." },
  { title: "Your dashboard", body: "See sales, recent orders, profile strength and tasks that need attention.", selector: '[href="/dashboard/vendor"]' },
  { title: "Get ready to sell", body: "Complete this checklist first: email, identity, payout details, store profile and your first item.", selector: '[data-tour="vendor-readiness"]' },
  { title: "Add and manage products", body: "Create simple, variable or digital products and manage prices, images and inventory.", selector: '[href="/dashboard/vendor/products"]' },
  { title: "Offer services", body: "Create bookings, quotes, subscriptions, virtual work or on-demand services.", selector: '[href="/dashboard/vendor/services"]', mobileMore: true },
  { title: "Set up delivery", body: "Choose self-delivery or LinkWe delivery, then configure pickup, regions and prices.", selector: '[href="/dashboard/vendor/shipping"]', mobileMore: true },
  { title: "Fulfil your orders", body: "Open orders that need action and update them as you prepare and deliver each purchase.", selector: '[href="/dashboard/vendor/orders"]' },
  { title: "Talk with customers", body: "Answer questions and keep every customer conversation organised in Messages.", selector: '[href="/dashboard/vendor/messages"]' },
  { title: "Track earnings and payouts", body: "Review sales, fees, available balance and payout requests from Finance.", selector: '[href="/dashboard/vendor/finance"]', mobileMore: true },
  { title: "Preview your public store", body: "Check what customers see and share your store when your profile is ready.", selector: '[data-tour="public-store"]' },
  { title: "You’re ready to explore", body: "Start with your store profile, shipping and first product. Replay tours anytime from Help & Tours." },
];

const product: Step[] = [
  { title: "Create your first product", body: "This walkthrough explains the important parts of the form without changing or publishing anything." },
  { title: "Choose the product type", body: "Select Simple, Variable or Digital. The form reveals the fields needed for your choice.", selector: '[data-tour="product-type"]' },
  { title: "Add clear product details", body: "Use a searchable name, useful description, correct category, condition and relevant tags.", selector: '[data-tour="product-details"]' },
  { title: "Set price and inventory", body: "Enter the selling price and stock. Variants can have separate prices and quantities.", selector: '[data-tour="product-pricing"]' },
  { title: "Upload strong images", body: "Add bright, clear photos. The first image becomes the main thumbnail.", selector: '[data-tour="product-images"]' },
  { title: "Delivery and pickup", body: "Choose delivery or collection and add accurate weight and dimensions when required.", selector: '[data-tour="product-shipping"]' },
  { title: "Save or publish", body: "Save a draft while working. Publish only after checking every detail and image.", selector: '[data-tour="product-actions"]' },
];

function visible(selector?: string) {
  if (!selector) return null;
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

export default function VendorGuidedTours() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [welcome, setWelcome] = useState(false);
  const [library, setLibrary] = useState(false);
  const [tour, setTour] = useState<TourName | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = tour === "product" ? product : essentials;
  const step = tour ? steps[index] : null;

  useEffect(() => {
    if (pathname !== "/dashboard/vendor") return;
    if (!localStorage.getItem(`linkwe-tour:${VERSION}:essentials`) && !sessionStorage.getItem(`linkwe-tour:${VERSION}:later`)) {
      const id = window.setTimeout(() => setWelcome(true), 900);
      return () => window.clearTimeout(id);
    }
  }, [pathname]);

  const measure = useCallback(() => setRect(visible(step?.selector)?.getBoundingClientRect() ?? null), [step?.selector]);
  useEffect(() => {
    if (!tour || !step) return;
    if (innerWidth < 768) window.dispatchEvent(new CustomEvent(step.mobileMore ? "vendor-tour:open-more" : "vendor-tour:close-more"));
    const id = window.setTimeout(() => {
      visible(step.selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(measure, 430);
    }, step.mobileMore ? 330 : 50);
    addEventListener("resize", measure);
    return () => { clearTimeout(id); removeEventListener("resize", measure); };
  }, [measure, step, tour]);

  const close = useCallback((complete = false) => {
    if (complete && tour) localStorage.setItem(`linkwe-tour:${VERSION}:${tour}`, "complete");
    window.dispatchEvent(new CustomEvent("vendor-tour:close-more"));
    setTour(null); setIndex(0); setRect(null);
  }, [tour]);

  const cardStyle = useMemo(() => {
    if (!rect) return { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
    const width = Math.min(380, innerWidth - 24);
    const below = rect.bottom + 18;
    const placeBelow = below + 270 < innerHeight;
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), innerWidth - width - 12);
    return { width, left, top: placeBelow ? below : Math.max(12, rect.top - 18), transform: placeBelow ? "none" : "translateY(-100%)" };
  }, [rect]);

  function start(name: TourName) {
    setWelcome(false); setLibrary(false); setIndex(0); setRect(null); setTour(name);
    if (name === "product" && pathname !== "/dashboard/vendor/products/new") {
      router.push("/dashboard/vendor/products/new");
    }
  }

  return <>
    <button type="button" onClick={() => setLibrary(true)} className="fixed bottom-[88px] left-3 z-[89] flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3.5 text-xs font-bold text-[#1C1C1A] shadow-[0_12px_34px_rgba(28,28,26,.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[#D4450A] md:bottom-5 md:left-[76px] lg:left-[238px]" aria-label="Open Help and Tours">
      <IconHelpCircle className="size-5 text-[#D4450A]"/><span className="hidden sm:inline">Help &amp; Tours</span>
    </button>

    {(welcome || library) && <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[3px] sm:items-center" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(0,0,0,.32)]">
        <div className="bg-gradient-to-br from-[#1C1C1A] via-[#25231F] to-[#56200C] px-6 pb-7 pt-6 text-white">
          <button type="button" onClick={() => { setWelcome(false); setLibrary(false); }} className="absolute right-4 top-4 rounded-full bg-white/10 p-2" aria-label="Close"><IconX className="size-4"/></button>
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F06A2A] to-[#D4450A] shadow-lg"><IconSparkles className="size-6"/></div>
          <h2 className="text-2xl font-black tracking-tight">{library ? "Help & Tours" : "Welcome to LinkWe"}</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">{library ? "Replay a walkthrough whenever you need a hand." : "Take a quick guided tour and learn exactly where to begin."}</p>
        </div>
        <div className="space-y-3 p-5">
          {([{name:"essentials", label:"Dashboard Essentials", meta:`About 2 minutes · ${essentials.length} steps`},{name:"product", label:"Create Your First Product", meta:`Form guide · ${product.length} steps`}] as const).map(item => <button key={item.name} type="button" onClick={() => start(item.name)} className="group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-[#FAF8F5] p-4 text-left hover:border-[#D4450A]/30 hover:bg-[#FFF5EF]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#D4450A] text-white"><IconPlayerPlay className="size-5"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-zinc-900">{item.label}</span><span className="mt-1 block text-xs text-zinc-500">{item.meta}</span></span><IconArrowRight className="size-5 text-zinc-300 group-hover:text-[#D4450A]"/>
          </button>)}
          {!library && <button type="button" onClick={() => { sessionStorage.setItem(`linkwe-tour:${VERSION}:later`, "1"); setWelcome(false); }} className="w-full py-2 text-xs font-semibold text-zinc-500">Maybe later</button>}
        </div>
      </div>
    </div>}

    {tour && step && <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
      {rect ? <div className="pointer-events-none fixed rounded-[18px] border-2 border-[#FF7A3D] shadow-[0_0_0_9999px_rgba(12,12,11,.72),0_0_0_6px_rgba(212,69,10,.2)] transition-all duration-500" style={{left:rect.left-7,top:rect.top-7,width:rect.width+14,height:rect.height+14}}/> : <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"/>}
      <div className="fixed max-w-[calc(100vw-24px)] overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(0,0,0,.35)] transition-all duration-500" style={cardStyle}>
        <div className="h-1 bg-gradient-to-r from-[#D4450A] via-[#F27B42] to-[#E8820C]"/><div className="p-5">
          <div className="mb-4 flex items-center justify-between"><span className="rounded-full bg-[#FEF0EB] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#D4450A]">{index+1} of {steps.length}</span><button type="button" onClick={() => close(false)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100" aria-label="Close"><IconX className="size-4"/></button></div>
          <h3 className="text-xl font-black tracking-tight text-[#1C1C1A]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full rounded-full bg-[#D4450A] transition-all duration-500" style={{width:`${((index+1)/steps.length)*100}%`}}/></div>
          <div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={index===0} onClick={() => setIndex(v=>v-1)} className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-zinc-500 disabled:invisible"><IconArrowLeft className="size-4"/>Back</button>{index===steps.length-1?<button type="button" onClick={() => close(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#D4450A] px-5 text-sm font-bold text-white"><IconCheck className="size-4"/>Finish</button>:<button type="button" onClick={() => setIndex(v=>v+1)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1C1C1A] px-5 text-sm font-bold text-white">Next<IconArrowRight className="size-4"/></button>}</div>
        </div>
      </div>
    </div>}
  </>;
}
