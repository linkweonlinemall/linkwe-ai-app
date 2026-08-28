"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowRight, IconCheck, IconHelpCircle, IconPlayerPlay, IconSparkles, IconX } from "@tabler/icons-react";

type TourName = "essentials" | "product" | "services" | "orders" | "bookings" | "subscribers" | "events" | "requests" | "store" | "partners" | "shipping" | "finance" | "messages" | "reviews" | "staff" | "settings";
type Step = { title: string; body: string; selector?: string; mobileMore?: boolean };
type TourDefinition = { label: string; description: string; route: string; category: "Start selling" | "Sales & customers" | "Run your business"; steps: Step[] };
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

const featureTour = (label: string, description: string, route: string, category: TourDefinition["category"], selector: string, mobileMore: boolean, steps: Array<[string, string]>): TourDefinition => ({
  label, description, route, category,
  steps: steps.map(([title, body], index) => ({ title, body, selector: index === 0 ? selector : undefined, mobileMore: index === 0 ? mobileMore : false })),
});

const tours: Record<TourName, TourDefinition> = {
  essentials: { label: "Dashboard overview", description: "Learn your control centre and the best first steps.", route: "/dashboard/vendor", category: "Start selling", steps: essentials },
  product: { label: "Products", description: "Create, price, publish and manage inventory.", route: "/dashboard/vendor/products/new", category: "Start selling", steps: product },
  services: featureTour("Services", "Set up bookings, quotes and service payments.", "/dashboard/vendor/services", "Start selling", '[href="/dashboard/vendor/services"]', true, [
    ["Build the right service", "Choose booking, quote, subscription, virtual or on-demand based on how customers should buy."],
    ["Set expectations clearly", "Add deliverables, duration, price or deposit rules, availability and a clear cancellation policy."],
    ["Manage every sale", "Use Service orders for fulfilment and Bookings for scheduled appointments. Keep status updates current."],
  ]),
  orders: featureTour("Orders", "Process purchases from payment to completion.", "/dashboard/vendor/orders", "Sales & customers", '[href="/dashboard/vendor/orders"]', false, [
    ["Find orders needing action", "Start with Action required. Open the order to confirm its payment, delivery method and items."],
    ["Use the correct fulfilment flow", "Shipping, local pickup and digital orders have different steps. Only advance a status after the action is complete."],
    ["Protect the customer experience", "Add tracking when applicable, communicate delays in Messages and never fulfil a pending-payment order."],
  ]),
  bookings: featureTour("Bookings", "Handle appointments, schedules and attendance.", "/dashboard/vendor/bookings", "Sales & customers", '[href="/dashboard/vendor/bookings"]', true, [
    ["Review your calendar", "Use date and status filters to find upcoming, completed, cancelled and deposit-pending bookings."],
    ["Open the booking card", "Confirm the customer, service, time, payment method and any instructions before the appointment."],
    ["Keep availability accurate", "Block unavailable time and update staff schedules so customers cannot reserve conflicting slots."],
  ]),
  subscribers: featureTour("Subscribers", "Manage recurring service customers.", "/dashboard/vendor/subscribers", "Sales & customers", '[href="/dashboard/vendor/subscribers"]', true, [
    ["Understand subscriber status", "See who is active, paused, cancelled or awaiting payment and which plan they purchased."],
    ["Review recurring activity", "Open a subscriber to check the billing cycle, service access and next expected payment."],
    ["Communicate changes", "Message customers before material service changes and keep plan benefits and terms accurate."],
  ]),
  events: featureTour("Events", "Publish events and manage ticket sales.", "/dashboard/vendor/events", "Start selling", '[href="/dashboard/vendor/events"]', true, [
    ["Create a complete event", "Add a strong cover, venue or online details, schedule, policies and organiser contact information."],
    ["Design ticket types", "Set price, quantity, sales window and limits for each ticket. Preview before publishing."],
    ["Run the event", "Track attendees, scan valid tickets at check-in and use event controls for edits or cancellation."],
  ]),
  requests: featureTour("Requests", "Respond to custom customer enquiries.", "/dashboard/vendor/requests", "Sales & customers", '[href="/dashboard/vendor/requests"]', true, [
    ["Review the full request", "Check the requested work, deadline, budget, attachments and customer notes before responding."],
    ["Send a precise offer", "State your scope, price, timing and what you need from the customer. Avoid unclear promises."],
    ["Track the outcome", "Keep accepted work updated and close requests that are completed, declined or cancelled."],
  ]),
  store: featureTour("Store profile", "Make your storefront complete and trustworthy.", "/dashboard/vendor/store/edit", "Start selling", '[href="/dashboard/vendor/store/edit"]', true, [
    ["Build customer trust", "Use the correct logo, cover, description, category, location and contact information."],
    ["Complete operational details", "Set opening hours, amenities, gallery photos and policies customers need before buying."],
    ["Preview before sharing", "Open your public store on mobile and desktop, then correct incomplete or outdated information."],
  ]),
  partners: featureTour("Partners", "Build and manage vendor partnerships.", "/dashboard/vendor/partners", "Run your business", '[href="/dashboard/vendor/partners"]', true, [
    ["Find suitable partners", "Review the store and partnership purpose before sending a clear, relevant request."],
    ["Manage invitations", "Accept only partnerships you recognise. You can cancel your own pending requests when plans change."],
    ["Keep collaboration useful", "Use partner access responsibly and remove relationships that are no longer active."],
  ]),
  shipping: featureTour("Shipping & pickup", "Configure delivery zones, rates and collection.", "/dashboard/vendor/shipping", "Run your business", '[href="/dashboard/vendor/shipping"]', true, [
    ["Choose fulfilment methods", "Enable local pickup, your own delivery or LinkWe delivery only where each option is genuinely available."],
    ["Configure every region", "Set clear rates, delivery estimates and free-shipping thresholds. Review LinkWe delivery switches by zone."],
    ["Test before selling", "Check a product in the cart using different regions and pickup to verify the correct price and tracking flow."],
  ]),
  finance: featureTour("Finance & payouts", "Understand earnings, fees and available funds.", "/dashboard/vendor/finance", "Run your business", '[href="/dashboard/vendor/finance"]', true, [
    ["Read your balances", "Sales, pending funds and available balance are different. Only eligible completed online payments become payable."],
    ["Review transaction details", "Check the order, platform fees, payment status and any adjustments before requesting a payout."],
    ["Request payouts safely", "Confirm your payout details and available balance. Pay-on-arrival services do not create payout funds."],
  ]),
  messages: featureTour("Messages", "Find conversations and support customers.", "/dashboard/vendor/messages", "Sales & customers", '[href="/dashboard/vendor/messages"]', false, [
    ["Find the right conversation", "Search by customer or topic and use filters for unread, orders, services and other message types."],
    ["Keep replies useful", "Answer clearly, reference the correct order or booking and use attachments only when needed."],
    ["Stay organised", "Resolve the customer’s question, keep commitments inside the conversation and return to unread threads promptly."],
  ]),
  reviews: featureTour("Reviews", "Monitor feedback and protect your reputation.", "/dashboard/vendor/reviews", "Sales & customers", '[href="/dashboard/vendor/reviews"]', true, [
    ["Understand your feedback", "Use ratings and comments to identify what customers value and where service needs improvement."],
    ["Respond professionally", "Acknowledge the experience, stay factual and explain a remedy without exposing private information."],
    ["Improve the business", "Look for repeated themes and update products, policies or fulfilment rather than treating reviews in isolation."],
  ]),
  staff: featureTour("Staff & availability", "Set schedules and prevent booking conflicts.", "/dashboard/vendor/staff", "Run your business", '[href="/dashboard/vendor/staff"]', true, [
    ["Create accurate schedules", "Add staff and working hours that reflect when each person can deliver bookable services."],
    ["Assign services carefully", "Connect the right team member to each service and account for preparation or travel time."],
    ["Block exceptions", "Record leave, closures and one-off unavailable periods before customers can reserve them."],
  ]),
  settings: featureTour("Settings", "Control account, security and notifications.", "/dashboard/vendor/settings", "Run your business", '[href="/dashboard/vendor/settings"]', true, [
    ["Keep account details current", "Review your personal information and the email used for important LinkWe notices."],
    ["Protect access", "Use a strong unique password and sign out of devices you do not control."],
    ["Choose useful notifications", "Keep essential order, booking, message and payment alerts enabled so customer work is not missed."],
  ]),
};

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
  const steps = tour ? tours[tour].steps : essentials;
  const step = tour ? steps[index] : null;

  useEffect(() => {
    if (pathname !== "/dashboard/vendor") return;
    if (!localStorage.getItem(`linkwe-tour:${VERSION}:essentials`) && !sessionStorage.getItem(`linkwe-tour:${VERSION}:later`)) {
      const id = window.setTimeout(() => setWelcome(true), 900);
      return () => window.clearTimeout(id);
    }
  }, [pathname]);

  useEffect(() => {
    const openLibrary = () => setLibrary(true);
    window.addEventListener("vendor-tour:open-library", openLibrary);
    return () => window.removeEventListener("vendor-tour:open-library", openLibrary);
  }, []);

  const measure = useCallback(() => setRect(visible(step?.selector)?.getBoundingClientRect() ?? null), [step?.selector]);
  useEffect(() => {
    if (!tour || !step) return;
    if (innerWidth < 768) window.dispatchEvent(new CustomEvent(step.mobileMore ? "vendor-tour:open-more" : "vendor-tour:close-more"));
    const id = window.setTimeout(() => {
      visible(step.selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(measure, 430);
    }, step.mobileMore ? 330 : 50);
    let frame = 0;
    const followTarget = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    addEventListener("resize", followTarget);
    addEventListener("scroll", followTarget, true);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(frame);
      removeEventListener("resize", followTarget);
      removeEventListener("scroll", followTarget, true);
    };
  }, [measure, step, tour]);

  const close = useCallback((complete = false) => {
    if (complete && tour) localStorage.setItem(`linkwe-tour:${VERSION}:${tour}`, "complete");
    window.dispatchEvent(new CustomEvent("vendor-tour:close-more"));
    setTour(null); setIndex(0); setRect(null);
  }, [tour]);

  const spotlightStyle = useMemo(() => {
    if (!rect) return null;
    const left = Math.max(6, rect.left - 7);
    const top = Math.max(6, rect.top - 7);
    const right = Math.min(innerWidth - 6, rect.right + 7);
    const bottom = Math.min(innerHeight - 6, rect.bottom + 7);
    if (right <= left || bottom <= top) return null;
    return { left, top, width: right - left, height: bottom - top };
  }, [rect]);

  function start(name: TourName) {
    setWelcome(false); setLibrary(false); setIndex(0); setRect(null); setTour(name);
    if (pathname !== tours[name].route) router.push(tours[name].route);
  }

  return <>
    <button type="button" onClick={() => setLibrary(true)} className="fixed bottom-[88px] left-3 z-[89] flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3.5 text-xs font-bold text-[#1C1C1A] shadow-[0_12px_34px_rgba(28,28,26,.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[#D4450A] md:bottom-5 md:left-[76px] lg:left-[238px]" aria-label="Open Help and Tours">
      <IconHelpCircle className="size-5 text-[#D4450A]"/><span className="hidden sm:inline">Help &amp; Tours</span>
    </button>

    {(welcome || library) && <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/55 p-3 backdrop-blur-[3px] sm:items-center" role="dialog" aria-modal="true">
      <div className="relative flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-[0_30px_90px_rgba(0,0,0,.32)] sm:rounded-[26px]">
        <div className="shrink-0 bg-gradient-to-br from-[#1C1C1A] via-[#25231F] to-[#56200C] px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-7 sm:pt-6">
          <button type="button" onClick={() => { setWelcome(false); setLibrary(false); }} className="absolute right-4 top-4 rounded-full bg-white/10 p-2" aria-label="Close"><IconX className="size-4"/></button>
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F06A2A] to-[#D4450A] shadow-lg sm:mb-4 sm:size-12 sm:rounded-2xl"><IconSparkles className="size-5 sm:size-6"/></div>
          <h2 className="text-xl font-black tracking-tight sm:text-2xl">{library ? "Vendor Help Centre" : "Welcome to LinkWe"}</h2>
          <p className="mt-1.5 max-w-xl text-xs leading-5 text-white/65 sm:mt-2 sm:text-sm sm:leading-6">{library ? "Choose a short, focused tutorial. Each one explains the workflow and the checks that matter." : "Take a quick guided tour and learn exactly where to begin."}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          {(["Start selling", "Sales & customers", "Run your business"] as const).map(category => <section key={category}>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[.16em] text-zinc-400">{category}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.entries(tours) as Array<[TourName, TourDefinition]>).filter(([, item]) => item.category === category).map(([name, item]) => <button key={name} type="button" onClick={() => start(name)} className="group flex min-h-[74px] items-center gap-3 rounded-2xl border border-zinc-200 bg-[#FAF8F5] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#D4450A]/30 hover:bg-[#FFF5EF] hover:shadow-md">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#D4450A] text-white shadow-sm"><IconPlayerPlay className="size-4"/></span><span className="min-w-0 flex-1"><span className="block text-[13px] font-bold text-zinc-900">{item.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-zinc-500">{item.description}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-[#D4450A]">{item.steps.length} steps</span></span><IconArrowRight className="size-4 shrink-0 text-zinc-300 group-hover:text-[#D4450A]"/>
              </button>)}
            </div>
          </section>)}
          {!library && <button type="button" onClick={() => { sessionStorage.setItem(`linkwe-tour:${VERSION}:later`, "1"); setWelcome(false); }} className="w-full py-2 text-xs font-semibold text-zinc-500">Maybe later</button>}
        </div>
      </div>
    </div>}

    {tour && step && <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
      {spotlightStyle ? <div className="pointer-events-none fixed rounded-[18px] border-2 border-[#FF7A3D] shadow-[0_0_0_9999px_rgba(12,12,11,.72),0_0_0_6px_rgba(212,69,10,.2)] transition-[left,top,width,height] duration-300 ease-out" style={spotlightStyle}/> : <div className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"/>}
      <div className={`fixed left-2.5 right-2.5 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_18px_55px_rgba(0,0,0,.3)] backdrop-blur-xl md:bottom-auto md:left-auto md:right-5 md:top-1/2 md:w-[330px] md:-translate-y-1/2 md:rounded-[22px] ${step.mobileMore ? "top-[calc(env(safe-area-inset-top,0px)+58px)]" : "bottom-[calc(76px+env(safe-area-inset-bottom,0px))]"}`}>
        <div className="h-[3px] bg-gradient-to-r from-[#D4450A] via-[#F27B42] to-[#E8820C]"/><div className="p-3 md:p-5">
          <div className="flex items-start gap-2.5"><span className="mt-0.5 shrink-0 rounded-full bg-[#FEF0EB] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-[#D4450A] md:text-[10px]">{index+1}/{steps.length}</span><div className="min-w-0 flex-1"><h3 className="text-[13px] font-black leading-[18px] tracking-tight text-[#1C1C1A] md:text-xl md:leading-tight">{step.title}</h3><p className="mt-1 text-[10px] leading-[15px] text-zinc-600 md:mt-2 md:text-sm md:leading-6">{step.body}</p></div><button type="button" onClick={() => close(false)} className="shrink-0 rounded-full p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Close"><IconX className="size-3.5 md:size-4"/></button></div>
          <div className="mt-2.5 flex items-center gap-2 md:mt-5"><div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 md:h-1.5"><div className="h-full rounded-full bg-[#D4450A] transition-all duration-500" style={{width:`${((index+1)/steps.length)*100}%`}}/></div><button type="button" disabled={index===0} onClick={() => setIndex(v=>v-1)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 disabled:opacity-30 md:h-10 md:w-auto md:gap-1 md:border-0 md:px-3 md:text-xs md:font-bold"><IconArrowLeft className="size-3.5 md:size-4"/><span className="hidden md:inline">Back</span></button>{index===steps.length-1?<button type="button" onClick={() => close(true)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#D4450A] px-3 text-[10px] font-bold text-white md:h-11 md:gap-2 md:rounded-xl md:px-5 md:text-sm"><IconCheck className="size-3.5 md:size-4"/>Finish</button>:<button type="button" onClick={() => setIndex(v=>v+1)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#1C1C1A] px-3 text-[10px] font-bold text-white md:h-11 md:gap-2 md:rounded-xl md:px-5 md:text-sm">Next<IconArrowRight className="size-3.5 md:size-4"/></button>}</div>
        </div>
      </div>
    </div>}
  </>;
}
