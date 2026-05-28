"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

type Props = {
  continueHref: string | null;
  /** Show "My dashboard" CTA (vendors & couriers only). */
  showDashboardButton?: boolean;
};

const SLIDES = [
  {
    image: "/morning-front.png",
    badge: "TRINIDAD & TOBAGO'S MARKETPLACE",
    heading: ["Shop local.", "Support local.", "Powered by AI."],
    headingHighlight: 2,
    sub: "LinkWe connects you with vendors across Trinidad and Tobago. Search naturally, discover local stores, and shop with confidence.",
    primaryBtn: { label: "Shop with AI", href: "/chat" },
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
    <section className="relative w-full overflow-hidden font-sans min-h-[85vh] md:min-h-0 md:h-[clamp(500px,80vh,800px)]">
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
        <div className="absolute inset-0 bg-black/40" aria-hidden />
      </div>

      <div
        key={`content-${animKey}`}
        className="relative z-10 flex h-full max-w-3xl flex-col justify-end px-4 pb-10 pt-20 sm:px-8 md:px-16 md:pb-20 md:pt-24"
      >
        <p className="fade-up-1 mb-3 text-xs font-bold uppercase tracking-widest text-[#D4450A] md:mb-4">
          {slide.badge}
        </p>

        <h1 className="fade-up-2 mb-5 text-3xl font-semibold leading-tight tracking-tight text-white md:mb-8 md:text-6xl">
          {slide.heading.map((line, i) => (
            <span key={`${current}-${i}`} className={`block ${i === slide.headingHighlight ? "text-[#D4450A]" : ""}`}>
              {line}
            </span>
          ))}
        </h1>

        <p className="fade-up-3 mb-6 hidden max-w-[560px] text-base font-normal leading-normal text-gray-200 md:mb-10 md:block md:text-lg">
          {slide.sub}
        </p>

        <div className="fade-up-4 flex w-full max-w-md flex-col gap-3 md:max-w-none md:flex-row md:flex-wrap md:gap-4">
          <Link
            href={slide.primaryBtn.href}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#D4450A] px-8 font-sans text-base font-semibold text-white transition-all duration-200 ease-in-out hover:bg-[#B83A08] md:w-auto"
          >
            {slide.primaryBtn.label}
            <ArrowRight className="size-4 shrink-0" aria-hidden strokeWidth={2.25} />
          </Link>
          <Link
            href={slide.secondaryBtn.href}
            className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white bg-transparent px-8 font-sans text-base font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10 md:w-auto"
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
        className="hero-scroll-chevron absolute bottom-10 left-1/2 z-10 hidden -translate-x-1/2 text-white/70 transition-colors duration-200 ease-in-out hover:text-white md:flex"
        aria-label="Scroll to categories"
      >
        <ChevronDown className="size-6" strokeWidth={2} aria-hidden />
      </a>

      <div className="absolute bottom-5 left-4 z-10 flex gap-2.5 sm:left-8 md:bottom-6 md:left-16">
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
