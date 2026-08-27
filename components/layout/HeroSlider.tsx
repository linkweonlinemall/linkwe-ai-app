"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

type Props = {
  continueHref: string | null;
  /** Show "My dashboard" CTA (vendors only). */
  showDashboardButton?: boolean;
};

const SLIDES = [
  {
    image: "/morning-front.png",
    badge: "TRINIDAD & TOBAGO'S MARKETPLACE",
    heading: ["Shop local.", "Support local.", "Powered by AI."],
    headingHighlight: 2,
    sub: "LinkWe connects you with vendors across Trinidad and Tobago. Search naturally, discover local stores, and shop with confidence.",
    primaryBtn: { label: "Start shopping", href: "/shop" },
    secondaryBtn: { label: "Browse stores", href: "/stores" },
    pan: "from-left" as const,
  },
  {
    image: "/evening-front.png",
    badge: "DELIVERY ACROSS THE ISLAND",
    heading: ["Order from local vendors.", "Delivered to you."],
    headingHighlight: 1,
    sub: "From Port of Spain to San Fernando, Chaguanas to Tobago — fast delivery from verified local vendors.",
    primaryBtn: { label: "Start shopping", href: "/shop" },
    secondaryBtn: { label: "Find a store", href: "/stores" },
    pan: "from-right" as const,
  },
  {
    image: "/sale-front.png",
    badge: "HOT DEALS",
    heading: ["Big savings.", "Local brands.", "Real value."],
    headingHighlight: 0,
    sub: "Discover deals from Trinidad and Tobago's best local vendors. New products added daily.",
    primaryBtn: { label: "Shop deals", href: "/shop" },
    secondaryBtn: { label: "Sell your products", href: "/register" },
    pan: "from-bottom" as const,
  },
] as const;

export default function HeroSlider({ continueHref, showDashboardButton = false }: Props) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
      setAnimKey((k) => k + 1);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  function goTo(index: number) {
    setCurrent(index);
    setAnimKey((k) => k + 1);
  }

  const slide = SLIDES[current]!;
  const showDashboard =
    showDashboardButton && !!continueHref && current === 0;

  return (
    <section className="relative min-h-[760px] w-full overflow-hidden bg-[#121210] font-sans sm:min-h-[780px] md:h-[clamp(620px,86vh,860px)] md:min-h-0">
      <style>{`
        @keyframes kenburns-left {
          from { transform: scale(1.08) translateX(2%); opacity: 0; }
          to { transform: scale(1) translateX(0%); opacity: 1; }
        }
        @keyframes kenburns-right {
          from { transform: scale(1.08) translateX(-2%); opacity: 0; }
          to { transform: scale(1) translateX(0%); opacity: 1; }
        }
        @keyframes kenburns-bottom {
          from { transform: scale(1.08) translateY(2%); opacity: 0; }
          to { transform: scale(1) translateY(0%); opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-chevron-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .kb-left { animation: kenburns-left 1.2s ease-out forwards; }
        .kb-right { animation: kenburns-right 1.2s ease-out forwards; }
        .kb-bottom { animation: kenburns-bottom 1.2s ease-out forwards; }
        .fade-up-1 { animation: fade-up 0.7s ease-out 0.3s both; }
        .fade-up-2 { animation: fade-up 0.7s ease-out 0.45s both; }
        .fade-up-3 { animation: fade-up 0.7s ease-out 0.6s both; }
        .fade-up-4 { animation: fade-up 0.7s ease-out 0.75s both; }
        .hero-scroll-chevron {
          animation: hero-chevron-bounce 2s ease-in-out infinite;
        }
      `}</style>

      <div key={`bg-${animKey}`} className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            slide.pan === "from-left" ? "kb-left" : slide.pan === "from-right" ? "kb-right" : "kb-bottom"
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={current === 0}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/58 to-black/20" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" aria-hidden />
        <div className="absolute -left-28 bottom-[-14rem] h-[32rem] w-[32rem] rounded-full bg-[#D4450A]/30 blur-[120px]" aria-hidden />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:64px_64px]" aria-hidden />
      </div>

      <div
        key={`content-${animKey}`}
        className="relative z-10 mx-auto flex h-full w-full max-w-screen-xl flex-col justify-end px-4 pb-20 pt-28 sm:px-6 sm:pb-24 md:justify-center md:px-8 md:pb-12 md:pt-28"
      >
        <div className="fade-up-1 mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-md sm:text-xs">
          <span className="h-2 w-2 rounded-full bg-[#F25A18] shadow-[0_0_18px_rgba(242,90,24,.9)]" />
          {slide.badge}
        </div>

        <h1 className="fade-up-2 mb-5 max-w-4xl text-[clamp(2.6rem,12vw,4.5rem)] font-black leading-[0.96] tracking-[-0.045em] text-white md:mb-7 md:text-[clamp(4.5rem,6.4vw,6.8rem)]">
          {slide.heading.map((line, i) => (
            <span key={`${current}-${i}`} className={`block ${i === slide.headingHighlight ? "bg-gradient-to-r from-[#FF7540] to-[#D4450A] bg-clip-text text-transparent" : ""}`}>
              {line}
            </span>
          ))}
        </h1>

        <p className="fade-up-3 mb-7 max-w-[590px] text-sm font-medium leading-6 text-white/75 sm:text-base md:mb-9 md:text-lg md:leading-8">
          {slide.sub}
        </p>

        <div className="fade-up-4 flex w-full max-w-md flex-col gap-3 sm:flex-row md:max-w-none md:flex-wrap md:gap-4">
          <Link
            href={slide.primaryBtn.href}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#E84B0B] to-[#C93600] px-8 font-sans text-sm font-bold text-white shadow-[0_14px_38px_rgba(212,69,10,.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(212,69,10,.48)] sm:w-auto sm:text-base"
          >
            {slide.primaryBtn.label}
            <ArrowRight className="size-4 shrink-0" aria-hidden strokeWidth={2.25} />
          </Link>
          <Link
            href={slide.secondaryBtn.href}
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-8 font-sans text-sm font-bold text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20 sm:w-auto sm:text-base"
          >
            {slide.secondaryBtn.label}
          </Link>
          {showDashboard ? (
            <Link
              href={continueHref!}
              className="hidden h-12 w-full items-center justify-center rounded-md border border-white bg-transparent px-8 font-sans text-base font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10 md:inline-flex md:w-auto"
            >
              My dashboard
            </Link>
          ) : null}
        </div>
      </div>

      <a
        href="#browse-categories"
        className="hero-scroll-chevron absolute bottom-9 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/15 bg-white/10 p-3 text-white/70 backdrop-blur transition-colors duration-200 hover:text-white md:flex"
        aria-label="Scroll to categories"
      >
        <ChevronDown className="size-6" strokeWidth={2} aria-hidden />
      </a>

      <div className="absolute bottom-8 left-4 z-10 flex gap-2.5 rounded-full border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-md sm:left-6 md:bottom-10 md:left-auto md:right-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-200 ease-in-out ${
              i === current
                ? "h-2 w-7 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                : "h-2 w-2 bg-white/40 ring-1 ring-white/30 hover:bg-white/70"
            }`}
            style={{ minWidth: i === current ? undefined : 8, minHeight: 8 }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
        className="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1C1C1A] shadow-md transition-all duration-200 ease-in-out hover:scale-105 hover:bg-white md:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-5" strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goTo((current + 1) % SLIDES.length)}
        className="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1C1C1A] shadow-md transition-all duration-200 ease-in-out hover:scale-105 hover:bg-white md:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="size-5" strokeWidth={2.25} aria-hidden />
      </button>
    </section>
  );
}
