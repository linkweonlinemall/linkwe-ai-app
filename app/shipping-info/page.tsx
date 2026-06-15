import type { Metadata } from "next";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Shipping & Delivery · LinkWe",
  description:
    "How LinkWe delivers orders across Trinidad and Tobago — vendor delivery, LinkWe delivery, areas, and timelines.",
};

export default function ShippingInfoPage() {
  return (
    <PublicStaticPageShell eyebrow="Support" title="Shipping & Delivery">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Getting your order to you</h2>
        <p className="text-sm leading-7 text-zinc-600">
          LinkWe connects you with local vendors right across Trinidad and Tobago, and we deliver to both islands.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">How delivery works</h2>
        <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
          <p>Every order is delivered in one of two ways, depending on the vendor:</p>
          <ul className="ml-4 flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              <span>
                <strong className="text-zinc-900">Vendor delivery</strong> — some vendors deliver their own orders and
                set their own delivery rates for each region.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
              <span>
                <strong className="text-zinc-900">LinkWe delivery</strong> — for other vendors, we coordinate the
                delivery for you. You&apos;ll see a LinkWe delivery fee at checkout.
              </span>
            </li>
          </ul>
          <p>
            Either way, you&apos;ll always see the exact delivery cost before you pay — no surprises at the end.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Delivery areas</h2>
        <p className="text-sm leading-7 text-zinc-600">
          We deliver across Trinidad and Tobago. At checkout, you&apos;ll choose your region and enter your delivery
          address. If a particular vendor can&apos;t deliver to your area, we&apos;ll let you know before you pay, so
          you&apos;re never charged for something that can&apos;t be delivered.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Delivery times</h2>
        <p className="text-sm leading-7 text-zinc-600">
          Delivery times vary by vendor and your location. Each vendor handles their own preparation and dispatch, so the
          timeframe depends on who you&apos;re buying from and where you are. You&apos;ll receive a notification the
          moment your order is on its way, and you can track each part of your order right from your account.
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold text-zinc-900">Orders from more than one vendor</h2>
        <p className="text-sm leading-7 text-zinc-600">
          Because LinkWe lets you shop across many stores in one cart, an order can include items from different vendors.
          When that happens, each vendor&apos;s items are prepared and delivered separately — so parts of your order may
          arrive at different times. You can track each one individually.
        </p>
      </section>
    </PublicStaticPageShell>
  );
}
