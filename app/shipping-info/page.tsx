import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, CheckCircle2, Download, MapPin, PackageCheck, Truck } from "lucide-react";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Shipping, Delivery & Pickup",
  description:
    "How LinkWe coordinates combined delivery, warehouse pickup, digital delivery, pricing, and order tracking across Trinidad and Tobago.",
};

const STEPS = [
  {
    Icon: PackageCheck,
    title: "Vendors prepare",
    text: "After payment is confirmed, each vendor prepares their portion of your order and sends it into the LinkWe fulfilment flow.",
  },
  {
    Icon: Boxes,
    title: "LinkWe combines",
    text: "For a multi-store order, physical parcels are brought together so they can move as one combined customer order.",
  },
  {
    Icon: Truck,
    title: "Delivery or pickup",
    text: "Your combined order is dispatched to your confirmed address, or made ready for collection when warehouse pickup is available and selected.",
  },
] as const;

export default function ShippingInfoPage() {
  return (
    <PublicStaticPageShell
      eyebrow="Orders & fulfilment"
      title="Shipping, Delivery & Pickup"
      subtitle="One checkout, one coordinated fulfilment journey—even when your cart includes products from several local stores."
      updated="11 September 2026"
    >
      <section>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A7FB5] to-[#2D9AD1] text-white shadow-md"><step.Icon className="size-5" /></span>
                <span className="text-[10px] font-black tracking-widest text-sky-700/45">0{index + 1}</span>
              </div>
              <h2 className="mt-4 text-base font-black text-zinc-900">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Your fulfilment choices</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
            <Truck className="size-6 text-[#1A7FB5]" />
            <h3 className="mt-3 font-black text-zinc-900">Combined delivery</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              LinkWe coordinates delivery of eligible physical products to the address and map pin you confirm at checkout. When you buy from more than one store, the checkout displays one combined delivery charge instead of charging a separate customer-delivery fee for every vendor.
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5">
            <MapPin className="size-6 text-[#D4450A]" />
            <h3 className="mt-3 font-black text-zinc-900">LinkWe warehouse pickup</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Pickup is shown only when the products in your cart support it. Wait until your account says the complete order is ready; multi-vendor parcels may reach LinkWe at different times before they are combined for collection.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">How the delivery price is calculated</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          The delivery quote is calculated at checkout using the confirmed destination, total billable parcel weight, distance band, and any inter-island requirement. Your map pin helps improve the quote; if it conflicts with the region you selected, checkout asks you to confirm the correct region before payment.
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <p>The total product price and delivery charge are displayed before you continue to WiPay. Digital-only orders have no physical delivery charge.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Coverage and timing</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>LinkWe supports delivery destinations across Trinidad and Tobago. Availability and price can depend on the destination, parcel details, and operational coverage shown at checkout.</p>
          <p>Delivery dates are estimates, not guarantees. Timing begins after successful payment and depends on every vendor preparing their portion, transfer to LinkWe, consolidation, weekends, public holidays, weather, road or sea conditions, and courier capacity.</p>
          <p>If an address cannot be served or an order cannot proceed as entered, LinkWe may contact you to correct the details, offer an available alternative, or arrange the appropriate cancellation or refund.</p>
        </div>
      </section>

      <section>
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Download className="size-5" /></span>
          <div>
            <h2 className="text-xl font-black text-zinc-900">Digital products</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              Digital products are delivered through the download flow after LinkWe confirms payment. No shipping address or physical delivery fee is required. The listing may specify file type, licence terms, expiry, and download limits.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Tracking and receiving your order</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Your Orders page follows each vendor portion and the combined order through preparation, arrival at LinkWe, packing, dispatch, delivery, or pickup readiness. LinkWe may also send account, email, or push notifications when important statuses change.</p>
          <p>For delivery, provide a reachable Trinidad and Tobago telephone number and accurate address/map pin. For collection or delivery confirmation, you may be asked to sign in and confirm receipt, including through the order&apos;s secure QR flow.</p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/orders" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#1A7FB5] to-[#2D9AD1] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(26,127,181,.24)]">Track my orders</Link>
          <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-100 bg-white px-5 text-sm font-black text-zinc-800 shadow-sm">Get delivery help</Link>
        </div>
      </section>
    </PublicStaticPageShell>
  );
}
