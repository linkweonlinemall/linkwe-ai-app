"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Props = {
  continueHref: string | null;
};

const SLIDES = [
  {
    image: "/morning-front.png",
    badge: "TRINIDAD & TOBAGO'S MARKETPLACE",
    heading: ["Shop local.", "Support local.", "Powered by AI."],
    headingHighlight: 2,
    sub: "LinkWe connects you with vendors across Trinidad and Tobago. Search naturally, discover local stores, and shop with confidence.",
    primaryBtn: { label: "Shop with AI →", href: "/chat" },
    secondaryBtn: { label: "Browse all products", href: "/shop" },
    showDashboard: true,
    pan: "from-left" as const,
  },
  {
    image: "/evening-front.png",
    badge: "DELIVERY ACROSS THE ISLAND",
    heading: ["Order from", "local vendors.", "Delivered to you."],
    headingHighlight: 2,
    sub: "From Port of Spain to San Fernando, Chaguanas to Tobago — fast delivery from verified local vendors.",
    primaryBtn: { label: "Start shopping →", href: "/shop" },
    secondaryBtn: { label: "Find a store", href: "/shop" },
    showDashboard: false,
    pan: "from-right" as const,
  },
  {
    image: "/sale-front.png",
    badge: "HOT DEALS",
    heading: ["Big savings.", "Local brands.", "Real value."],
    headingHighlight: 0,
    sub: "Discover deals from Trinidad and Tobago's best local vendors. New products added daily.",
    primaryBtn: { label: "Shop deals →", href: "/shop" },
    secondaryBtn: { label: "Sell your products", href: "/register" },
    showDashboard: false,
    pan: "from-bottom" as const,
  },
] as const;

export default function HeroSlider({ continueHref }: Props) {
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
      setAnimKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  function goTo(index: number) {
    setCurrent(index);
    setAnimKey((k) => k + 1);
  }

  const slide = SLIDES[current]!;

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(500px, 80vh, 800px)" }}
    >
      <style>{`
        @keyframes kenburns-left {
          from { transform: scale(1.08) translateX(2%); }
          to { transform: scale(1) translateX(0%); }
        }
        @keyframes kenburns-right {
          from { transform: scale(1.08) translateX(-2%); }
          to { transform: scale(1) translateX(0%); }
        }
        @keyframes kenburns-bottom {
          from { transform: scale(1.08) translateY(2%); }
          to { transform: scale(1) translateY(0%); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kb-left { animation: kenburns-left 6.5s ease-out forwards; }
        .kb-right { animation: kenburns-right 6.5s ease-out forwards; }
        .kb-bottom { animation: kenburns-bottom 6.5s ease-out forwards; }
        .fade-up-1 { animation: fade-up 0.7s ease-out 0.1s both; }
        .fade-up-2 { animation: fade-up 0.7s ease-out 0.25s both; }
        .fade-up-3 { animation: fade-up 0.7s ease-out 0.4s both; }
        .fade-up-4 { animation: fade-up 0.7s ease-out 0.55s both; }
      `}</style>

      <div key={`bg-${animKey}`} className="absolute inset-0">
        <img
          src={slide.image}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover
            ${slide.pan === "from-left" ? "kb-left" : slide.pan === "from-right" ? "kb-right" : "kb-bottom"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>

      <div
        key={`content-${animKey}`}
        className="relative flex h-full max-w-3xl flex-col justify-center px-8
          sm:px-16"
      >
        <p
          className="fade-up-1 mb-4 text-xs font-bold uppercase tracking-widest
          text-[#E8820C]"
        >
          {slide.badge}
        </p>

        <h1
          className="fade-up-2 mb-6 text-4xl
          font-black leading-tight text-white sm:text-6xl"
        >
          {slide.heading.map((line, i) => (
            <span key={`${current}-${i}`} className={`block ${i === slide.headingHighlight ? "text-[#D4450A]" : ""}`}>
              {line}
            </span>
          ))}
        </h1>

        <p
          className="fade-up-3 mb-8 max-w-xl text-base leading-relaxed
          text-white/80 sm:text-lg"
        >
          {slide.sub}
        </p>

        <div className="fade-up-4 flex flex-wrap gap-3">
          <Link
            href={slide.primaryBtn.href}
            className="rounded-xl bg-[#D4450A] px-7 py-3.5 text-base
              font-bold text-white shadow-lg shadow-[#D4450A]/30
              transition-all hover:bg-[#b83a09]"
          >
            {slide.primaryBtn.label}
          </Link>
          <Link
            href={slide.secondaryBtn.href}
            className="rounded-xl border border-white/20 bg-white/15 px-7 py-3.5
              text-base font-semibold text-white
              backdrop-blur-sm transition-all hover:bg-white/25"
          >
            {slide.secondaryBtn.label}
          </Link>
          {slide.showDashboard && continueHref && (
            <Link
              href={continueHref}
              className="rounded-xl border border-white/15 bg-white/10 px-7 py-3.5
                text-base font-semibold text-white
                backdrop-blur-sm transition-all hover:bg-white/20"
            >
              My dashboard
            </Link>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 left-8 flex gap-2 sm:left-16">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={`rounded-full transition-all
              ${
                i === current
                  ? "h-2 w-8 bg-[#D4450A]"
                  : "h-2 w-2 bg-white/40 hover:bg-white/70"
              }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
        className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2
          items-center justify-center rounded-full border border-white/20
          bg-white/10
          text-white
          backdrop-blur-sm
          transition-all hover:bg-white/25"
        aria-label="Previous slide"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo((current + 1) % SLIDES.length)}
        className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2
          items-center justify-center rounded-full border border-white/20
          bg-white/10
          text-white
          backdrop-blur-sm
          transition-all hover:bg-white/25"
        aria-label="Next slide"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </section>
  );
}
