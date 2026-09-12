import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CircleDollarSign, Clock3, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Returns, Cancellations & Refunds",
  description:
    "How LinkWe handles product problems, returns, booking cancellations, digital goods, ticket refunds, and payment reversals.",
};

const ISSUE_STEPS = [
  { Icon: MessageCircle, title: "Report the issue", text: "Contact the vendor through LinkWe or contact LinkWe Support as soon as possible." },
  { Icon: Camera, title: "Keep evidence", text: "Keep the item, packaging, order record, photos, video, and relevant messages while the issue is reviewed." },
  { Icon: PackageCheck, title: "Follow instructions", text: "Do not send an item back until the vendor or LinkWe confirms where and how it should be returned." },
  { Icon: CircleDollarSign, title: "Resolution", text: "Depending on the facts, the remedy may be a refund, replacement, repair, credit, re-performance, or another lawful solution." },
] as const;

export default function ReturnsPage() {
  return (
    <PublicStaticPageShell
      eyebrow="Customer care"
      title="Returns, Cancellations & Refunds"
      subtitle="A clear route to help when a product, service, booking, digital purchase, or ticket does not go as expected."
      updated="11 September 2026"
    >
      <section>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-white text-emerald-700 shadow-sm"><ShieldCheck className="size-6" /></span>
          <div>
            <h2 className="text-xl font-black text-zinc-900">Your statutory rights come first</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              A vendor&apos;s posted policy cannot remove rights or remedies that apply under Trinidad and Tobago law. Blanket statements such as “no refund” or “no exchange” do not prevent valid redress for goods that are defective, unsafe, not fit for their disclosed purpose, or materially different from what was represented.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">If something is wrong with a physical product</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Report damaged, incorrect, incomplete, unsafe, faulty, undelivered, or materially misdescribed goods as soon as possible. LinkWe asks customers to report order issues within 7 days of delivery so evidence and fulfilment records can be reviewed quickly. That reporting target does not shorten any longer right or remedy available under applicable law.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ISSUE_STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
              <step.Icon className="size-5 text-[#1A7FB5]" />
              <h3 className="mt-3 text-sm font-black text-zinc-900">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Change-of-mind returns</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          If an item is as described and works properly, a change-of-mind return is available only when the vendor&apos;s displayed return policy offers it or the vendor agrees. The vendor may set reasonable disclosed conditions, such as an unused condition, original packaging, a time window, or return-delivery responsibility, subject always to applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Services, bookings and requests</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Each bookable service can have its own cancellation window. When self-service cancellation is still available in your Bookings page, any eligible amount paid is submitted for refund through WiPay. After the displayed cancellation window has passed, message the vendor to discuss the booking.</p>
          <p>Custom and on-demand services may have different stages, deposits, quotations, attendance rules, and cancellation treatment. Review the listing and confirmed booking details before paying. A provider cancellation, service not delivered, or service materially different from the agreed description may qualify for redress.</p>
          <p>Recurring service subscriptions can be ended for future periods from the customer dashboard. Cancellation ordinarily stops future renewals and does not automatically refund a period already purchased, unless the service terms, the circumstances, or applicable law require otherwise.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Digital products</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Because access may be supplied immediately after payment, a delivered digital product is generally not returnable merely because you changed your mind. Contact us if the file is unavailable, corrupted, materially misdescribed, incompatible despite the listing&apos;s stated requirements, or supplied without the promised access or licence.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Events and tickets</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Ticket eligibility follows the event&apos;s displayed refund type and cutoff, together with applicable law. Used, transferred, expired, or otherwise ineligible tickets may not qualify.</p>
          <p>WiPay currently processes a ticket refund against the complete payment transaction, so approving a refund may require refunding the entire ticket order rather than one ticket from that transaction. If an event is cancelled, check My Tickets and your notifications for the refund status or next instructions.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">How approved refunds are paid</h2>
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-4">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-[#D4450A]" />
          <p className="text-sm leading-7 text-zinc-600">
            LinkWe submits approved card refunds to WiPay for return to the original payment method. A refund is not complete merely because it has been requested; processing and statement timing depend on WiPay, the card network, and your financial institution. Any applicable vendor earnings adjustment is handled within LinkWe.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">Need help resolving a purchase?</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Start with the vendor through LinkWe Messages, then contact LinkWe if the issue remains unresolved. Include your order, booking, request, subscription, or ticket reference—but never email full card details, passwords, or one-time codes.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-[#D4450A] to-[#F06A2A] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(212,69,10,.24)]">Contact LinkWe Support</Link>
          <a href="https://consumeraffairs.gov.tt/services/redress/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-100 bg-white px-5 text-sm font-black text-[#1A7FB5] shadow-sm">Consumer Affairs guidance</a>
        </div>
      </section>
    </PublicStaticPageShell>
  );
}
