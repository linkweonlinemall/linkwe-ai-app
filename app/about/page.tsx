import type { Metadata } from "next";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "About LinkWe · LinkWe",
  description:
    "The story behind LinkWe Online Mall — Trinidad & Tobago's homegrown marketplace for local products, services, and events.",
};

export default function AboutPage() {
  return (
    <PublicStaticPageShell eyebrow="Company" title="About LinkWe">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Our Story: Born in the Middle of the Night</h2>
        <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
          <p>
            Every great idea starts with a problem that needs solving. For LinkWe, that moment came at 2:00 AM on a
            quiet night in Trinidad.
          </p>
          <p>
            It began with a flood. Our founders, new parents at the time, were jolted awake by the sound of rushing water
            — their apartment filling up around them, a newborn in their arms. In the middle of the crisis, the hardest
            part wasn&apos;t the water. It was how impossibly long it took to reach a plumber. As the water rose, so did
            one frustrating question: Why doesn&apos;t Trinidad have a single place where you can find the help you need,
            instantly, right here at home?
          </p>
          <p>That night, amidst the chaos, LinkWe was born.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">How We Evolved</h2>
        <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
          <p>
            What started as a mission to connect families with emergency local services quickly grew into something
            bigger. Finding a plumber wasn&apos;t the only gap — people across Trinidad and Tobago needed a modern,
            trustworthy way to find everything online, from local sellers they could count on.
          </p>
          <p>
            So we took that first spark and built it out. Today, LinkWe Online Mall is a complete digital marketplace
            that brings together everything you need in one convenient space:
          </p>
          <ul className="ml-4 flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              <span>
                <strong className="text-zinc-900">Services</strong> — connecting you with local professionals when you
                need them.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              <span>
                <strong className="text-zinc-900">Products</strong> — a vibrant online mall of items from vendors right
                across the country.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              <span>
                <strong className="text-zinc-900">Events</strong> — a hub to discover the latest happenings,
                entertainment, and activities on both islands.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Our Mission</h2>
        <blockquote className="mb-4 border-l-4 border-[#D4450A] bg-[#FEF0EB] px-4 py-3 text-sm font-medium italic leading-7 text-zinc-800">
          To bridge the gap between community and convenience — making it simple, safe, and local to find whatever you
          need.
        </blockquote>
        <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
          <p>
            At LinkWe, we believe finding what you need should never be a stressful experience — whether it&apos;s an
            urgent repair, a one-of-a-kind product, or the hottest event in town. We&apos;re proud to be a homegrown
            platform, built out of a real Trinidadian experience, dedicated to making life easier, more connected, and
            more efficient for everyone in our twin-island republic.
          </p>
          <p>
            Thank you for being part of our journey. Welcome to the mall that has it all.
          </p>
        </div>
      </section>
    </PublicStaticPageShell>
  );
}
