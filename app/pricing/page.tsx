import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Check, Minus } from "lucide-react";

import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pricing · LinkWe",
  description:
    "Start free on LinkWe and only pay when you sell. Compare Starter, Growth, and Pro plans for Trinidad & Tobago vendors.",
};

type PlanFeature = {
  text: string;
  included: boolean;
  highlight?: boolean;
};

type PricingPlan = {
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  commission: string;
  cta: string;
  ctaHref: string;
  featured?: boolean;
  features: PlanFeature[];
};

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    tagline: "Everything you need to start selling.",
    price: "Free",
    priceNote: "No monthly fee — pay only when you sell",
    commission: "15% products · 8% services",
    cta: "Start free",
    ctaHref: "/contact",
    features: [
      { text: "Up to 30 products", included: true },
      { text: "Your own storefront", included: true },
      { text: "Orders, payouts & delivery tools", included: true },
      { text: "Sell events & tickets (6%)", included: true },
      { text: "AI store assistant", included: false },
      { text: "Featured placement", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Growth",
    tagline: "For shops ready to scale and sell smarter.",
    price: "TTD 200",
    priceNote: "per month",
    commission: "12% products · 5% services",
    cta: "Upgrade to Growth",
    ctaHref: "/contact",
    featured: true,
    features: [
      { text: "Up to 300 products", included: true },
      { text: "Your own storefront", included: true },
      { text: "Orders, payouts & delivery tools", included: true },
      { text: "Sell events & tickets (6%)", included: true },
      { text: "AI assistant — 300 uses/mo", included: true, highlight: true },
      { text: "Top up AI anytime (TTD 1 = 1 use)", included: true },
      { text: "Eligible for featured placement", included: true },
    ],
  },
  {
    name: "Pro",
    tagline: "Maximum reach, lowest fees, full power.",
    price: "TTD 450",
    priceNote: "per month",
    commission: "8% products · 3% services",
    cta: "Upgrade to Pro",
    ctaHref: "/contact",
    features: [
      { text: "Unlimited products", included: true },
      { text: "Your own storefront", included: true },
      { text: "Orders, payouts & delivery tools", included: true },
      { text: "Sell events & tickets (6%)", included: true },
      { text: "AI assistant — 1,000 uses/mo", included: true, highlight: true },
      { text: "Top up AI anytime (TTD 1 = 1 use)", included: true },
      { text: "Priority placement + support", included: true },
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "Do I pay anything to start?",
    answer: "No. Starter is free forever — you only pay commission when you make a sale.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. Upgrade or downgrade anytime as your business grows.",
  },
  {
    question: "What are AI uses?",
    answer:
      "Each message you send to your AI assistant is one use. Plans include a monthly amount, and you can top up at TTD 1 per use.",
  },
  {
    question: "How do I get paid?",
    answer:
      "Your earnings build as orders complete, and you request payouts to your bank from your dashboard.",
  },
] as const;

function FeatureRow({ feature }: { feature: PlanFeature }) {
  if (feature.included) {
    return (
      <li className="flex items-start gap-2.5">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4450A]" strokeWidth={2.5} aria-hidden />
        <span
          className={
            feature.highlight
              ? "text-sm font-bold leading-6 text-[#D4450A]"
              : "text-sm leading-6 text-zinc-700"
          }
        >
          {feature.text}
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2.5">
      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" strokeWidth={2} aria-hidden />
      <span className="text-sm leading-6 text-zinc-400">{feature.text}</span>
    </li>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  const isFeatured = plan.featured === true;

  return (
    <article
      className={[
        "relative flex h-full flex-col rounded-[18px] bg-white p-6 sm:p-7",
        isFeatured
          ? "border-2 border-[#D4450A] shadow-[0_20px_50px_-12px_rgba(212,69,10,0.28)] lg:-translate-y-2"
          : "border border-zinc-200 shadow-[0_8px_30px_-12px_rgba(28,28,26,0.12)] transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(28,28,26,0.18)]",
      ].join(" ")}
    >
      {isFeatured ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4450A] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          MOST POPULAR
        </span>
      ) : null}

      <div>
        <h2 className="font-display text-xl font-bold text-zinc-900">{plan.name}</h2>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{plan.tagline}</p>
      </div>

      <div className="mt-6">
        <p className="font-display text-4xl font-bold tracking-tight text-zinc-900">{plan.price}</p>
        <p className="mt-1 text-sm text-zinc-500">{plan.priceNote}</p>
      </div>

      <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Commission</p>
        <p className="mt-1 text-sm font-semibold text-zinc-800">{plan.commission}</p>
      </div>

      <Link
        href={plan.ctaHref}
        className={[
          "mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors",
          isFeatured
            ? "bg-[#D4450A] text-white hover:bg-[#B83A09]"
            : "border-2 border-[#D4450A] text-[#D4450A] hover:bg-[#D4450A] hover:text-white",
        ].join(" ")}
      >
        {plan.cta}
      </Link>

      <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-zinc-100 pt-6">
        {plan.features.map((feature) => (
          <FeatureRow key={feature.text} feature={feature} />
        ))}
      </ul>
    </article>
  );
}

export default async function PricingPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />

      <section className="bg-[#1C1C1A] px-4 pb-32 pt-14 sm:px-6 sm:pt-16 lg:pb-36 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-[#D4450A]/15 px-4 py-1.5 text-xs font-semibold text-[#E8820C]">
            The only T&amp;T marketplace with a built-in AI assistant
          </span>
          <h1 className="font-display mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Plans that grow with your business
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Start free and only pay when you sell. Upgrade when you&apos;re ready for lower fees, more
            products, and your own AI store assistant.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl -mt-24 px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-5 rounded-[18px] border border-zinc-200 bg-white p-6 sm:flex-row sm:items-start sm:gap-6 sm:p-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#D4450A]/10 text-[#D4450A]"
            aria-hidden
          >
            <Bot className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900">Meet Rex, your AI store assistant</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Add products, edit listings, manage events, and get sales insights — just by chatting.
              Included on Growth and Pro, and you can top up anytime at TTD 1 per use. No other Trinidad
              &amp; Tobago marketplace offers this.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-center text-2xl font-bold text-zinc-900">Common questions</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="rounded-[18px] border border-zinc-200 bg-white p-5 shadow-[0_4px_20px_-10px_rgba(28,28,26,0.1)]"
            >
              <h3 className="text-sm font-bold text-zinc-900">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="rounded-[18px] bg-[#1C1C1A] px-6 py-10 text-center sm:px-10 sm:py-12">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Ready to open your store?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">
            Start free today. Upgrade whenever you&apos;re ready.
          </p>
          <Link
            href="/register/business"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#D4450A] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#B83A09]"
          >
            Become a vendor
          </Link>
        </div>
      </section>
    </div>
  );
}
