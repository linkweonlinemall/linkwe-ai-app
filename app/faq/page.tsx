import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions · LinkWe",
  description:
    "Answers to common questions about shopping, delivery, returns, accounts, and selling on LinkWe in Trinidad & Tobago.",
};

function FaqItem({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <div className="border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0">
      <p className="text-sm font-bold text-zinc-900">{question}</p>
      <div className="mt-2 text-sm leading-7 text-zinc-600">{answer}</div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicStaticPageShell eyebrow="Support" title="Frequently Asked Questions">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Shopping & Orders</h2>
        <div className="flex flex-col gap-4">
          <FaqItem
            question="Is it safe to shop on LinkWe?"
            answer="Yes. LinkWe is a homegrown Trinidad & Tobago platform, and all payments are processed securely through encrypted, industry-standard payment systems. Your card details are never stored on our servers."
          />
          <FaqItem
            question="Can I pay with my local TTD card?"
            answer="Yes. LinkWe accepts local and international Visa and Mastercard, and all prices are shown in TT dollars, so you always know exactly what you're paying."
          />
          <FaqItem
            question="How do I place an order?"
            answer="Browse or search for what you want, add it to your cart, and check out. You'll choose your delivery region, enter your address, and pay securely by card. You can shop from several vendors in a single cart and check out all at once."
          />
          <FaqItem
            question="Can I buy from more than one store at the same time?"
            answer="Yes — that's one of the best parts of LinkWe. Your cart can hold items from different vendors, and you check out once. Each vendor then prepares and delivers their part of your order."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Delivery</h2>
        <div className="flex flex-col gap-4">
          <FaqItem
            question="Where does LinkWe deliver?"
            answer="Across Trinidad and Tobago. You'll choose your region at checkout, and we'll show you the delivery cost before you pay. If a vendor can't reach your area, we'll tell you before checkout."
          />
          <FaqItem
            question="How long will my order take?"
            answer="It depends on the vendor and your location, since each vendor handles their own delivery. You'll get a notification when your order is on its way and can track it from your account."
          />
          <FaqItem
            question="Why did my order arrive in separate deliveries?"
            answer="If you bought from more than one vendor, each vendor sends their items separately, so parts of your order may arrive at different times. You can track each part on your orders page."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Returns & Problems</h2>
        <div className="flex flex-col gap-4">
          <FaqItem
            question="What if something is wrong with my order?"
            answer={
              <>
                Report it within 7 days of delivery, through your account or by contacting us, and LinkWe will help
                resolve it with the vendor. Approved refunds go back to your original card. See our{" "}
                <Link href="/returns" className="font-semibold text-[#D4450A] hover:underline">
                  Returns & Refunds
                </Link>{" "}
                page for details.
              </>
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">Account & Support</h2>
        <div className="flex flex-col gap-4">
          <FaqItem
            question="Do I need an account to shop?"
            answer="You'll need an account to check out and track your orders — it's quick and free to create."
          />
          <FaqItem
            question="How do I contact support?"
            answer={
              <>
                Email us anytime at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>
                , or use the{" "}
                <Link href="/contact" className="font-semibold text-[#D4450A] hover:underline">
                  contact page
                </Link>
                . We&apos;re here to help.
              </>
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-zinc-900">For Vendors</h2>
        <div className="flex flex-col gap-4">
          <FaqItem
            question="How do I sell on LinkWe?"
            answer="Sign up for a business account and complete a short onboarding — set up your store, verify your details, and start listing products, services, or events. Once approved, your store goes live to shoppers across T&T."
          />
          <FaqItem
            question="How do I get paid?"
            answer="Your earnings build up as your orders are completed, and you can request a payout to your bank account from your vendor dashboard."
          />
        </div>
      </section>
    </PublicStaticPageShell>
  );
}
