import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Current answers about LinkWe shopping, combined delivery, pickup, returns, services, tickets, Timeline, Rex, vendor plans, and payments.",
};

function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-sky-100 bg-gradient-to-r from-white to-sky-50/45 px-4 shadow-sm open:shadow-[0_12px_32px_rgba(26,127,181,.09)] sm:px-5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-black text-zinc-900 marker:content-none">
        {question}
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#1A7FB5] shadow-sm transition group-open:rotate-180"><ChevronDown className="size-4" /></span>
      </summary>
      <div className="border-t border-sky-100 pb-5 pt-4 text-sm leading-7 text-zinc-600">{children}</div>
    </details>
  );
}

function FaqGroup({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#1A7FB5]">{kicker}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <PublicStaticPageShell
      eyebrow="Help centre"
      title="Frequently Asked Questions"
      subtitle="Straight answers for customers, vendors, service providers, and event organisers using LinkWe today."
      updated="11 September 2026"
    >
      <section>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/shipping-info" style={{ background: "linear-gradient(135deg,#1A7FB5,#155f91)" }} className="rounded-2xl p-5 text-white shadow-[0_14px_32px_rgba(26,127,181,.22)] transition hover:-translate-y-0.5"><p className="text-[10px] font-black uppercase tracking-wider text-white/60">Orders</p><p className="mt-2 font-black">Shipping & pickup →</p></Link>
          <Link href="/returns" className="rounded-2xl bg-gradient-to-br from-[#D4450A] to-[#F28A2D] p-5 text-white shadow-[0_14px_32px_rgba(212,69,10,.22)] transition hover:-translate-y-0.5"><p className="text-[10px] font-black uppercase tracking-wider text-white/65">Help</p><p className="mt-2 font-black">Returns & refunds →</p></Link>
          <Link href="/contact" style={{ background: "linear-gradient(135deg,#18181b,#3f3f46)" }} className="rounded-2xl p-5 text-white shadow-[0_14px_32px_rgba(24,24,27,.2)] transition hover:-translate-y-0.5"><p className="text-[10px] font-black uppercase tracking-wider text-white/55">Support</p><p className="mt-2 font-black">Contact LinkWe →</p></Link>
        </div>
      </section>

      <FaqGroup kicker="Marketplace" title="Shopping and checkout">
        <FaqItem question="What can I find on LinkWe?">You can discover physical and digital products, local services, bookings, custom and on-demand requests, subscriptions, events, tickets, stores, and shoppable updates on Timeline.</FaqItem>
        <FaqItem question="Do I need an account to shop?">You can browse without an account. An account is required to complete checkout, receive digital purchases or tickets, message businesses, manage bookings, follow stores, and track orders.</FaqItem>
        <FaqItem question="Can I buy from several stores in one cart?">Yes. You pay through one checkout. LinkWe creates a portion for each vendor to prepare, then coordinates eligible physical products into the combined delivery or pickup journey shown in your account.</FaqItem>
        <FaqItem question="How are payments handled?">Prices are shown in TTD unless stated otherwise. Card payment is processed by WiPay using the payment options it displays. LinkWe receives transaction status and references but does not store your full card number or security code.</FaqItem>
        <FaqItem question="When is an order confirmed?">Only after LinkWe receives successful payment confirmation. An abandoned, declined, or unconfirmed payment does not reserve stock or create a right to fulfilment.</FaqItem>
        <FaqItem question="Why is a vendor asking questions at checkout?">A product may require a size, name, artwork, file, preference, or other detail needed to fulfil it. The question and whether it is required are shown before payment. Only provide information relevant to the order.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Fulfilment" title="Delivery, pickup and downloads">
        <FaqItem question="How does LinkWe delivery work?">Vendors prepare their portions and send them into LinkWe&apos;s fulfilment flow. Physical parcels from multiple stores can be combined, then delivered as one customer order. Track preparation, consolidation, dispatch, and delivery from Orders.</FaqItem>
        <FaqItem question="How is the delivery fee calculated?">Checkout calculates one combined customer-delivery quote using the confirmed destination, parcel weight, distance, and any inter-island requirement. You see the charge before continuing to WiPay.</FaqItem>
        <FaqItem question="Can I collect my order?">When eligible products support pickup, checkout may offer collection from the LinkWe warehouse. Wait for the ready-for-pickup notification; every vendor portion must arrive and be combined first.</FaqItem>
        <FaqItem question="How long does delivery take?">Timing varies with vendor preparation, consolidation, destination, weekends, public holidays, weather, road or sea conditions, and courier capacity. Statuses shown in your account are the best current update; delivery estimates are not guarantees unless expressly stated.</FaqItem>
        <FaqItem question="How do digital products arrive?">After payment is confirmed, access is provided through LinkWe&apos;s download flow. The listing can specify file type, licence, download limit, and expiry. Digital-only orders do not need a shipping address or delivery fee.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Resolution" title="Returns, cancellations and refunds">
        <FaqItem question="What if an item is damaged, wrong, missing, faulty, or not as described?">Report it as soon as possible through the vendor conversation or LinkWe Support. We ask that order problems be reported within 7 days for faster evidence review, without limiting any longer right available under law. Keep the item, packaging, photos, order record, and messages.</FaqItem>
        <FaqItem question="Can a vendor say “no refunds” for everything?">No blanket vendor statement removes statutory consumer rights. A valid remedy may be available for defective, unsafe, unfit, or materially misdescribed goods. Change-of-mind returns, however, depend on the vendor&apos;s disclosed policy unless law requires otherwise.</FaqItem>
        <FaqItem question="Where does an approved refund go?">LinkWe submits approved refunds through WiPay to the original payment method. Provider, card-network, and bank processing times vary, so a submitted refund may not appear immediately.</FaqItem>
        <FaqItem question="Can I cancel a booking?">Your Bookings page allows cancellation while the service&apos;s self-service cancellation window remains open. Eligible paid amounts are submitted for refund. After that window, message the vendor to discuss the booking.</FaqItem>
        <FaqItem question="Can I refund one ticket from a larger ticket purchase?">WiPay currently processes ticket refunds against the complete payment transaction. A refund may therefore require the whole ticket order to be refunded. Eligibility also depends on the event&apos;s displayed refund policy and cutoff.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Services & events" title="Bookings, requests and tickets">
        <FaqItem question="What kinds of services are supported?">Businesses can offer scheduled bookings, quotation-based work, on-demand requests, virtual services, and recurring subscriptions. The listing explains price or deposit, duration, location, availability, cancellation, and any vendor-specific terms.</FaqItem>
        <FaqItem question="Where do I find my booking or request?">Confirmed appointments appear in Bookings. Custom and on-demand work appears in My Requests. Use Messages when you need to clarify fulfilment with the provider.</FaqItem>
        <FaqItem question="How do event tickets work?">After confirmed payment, eligible tickets appear under My Tickets with their event details and QR credential. Keep the QR private. Event staff scan it for check-in, and an available transfer tool may let you transfer a valid ticket.</FaqItem>
        <FaqItem question="What happens if an event changes or is cancelled?">The organiser is responsible for event details and updates. Check My Tickets, email, and LinkWe notifications for instructions and refund status. Refund treatment follows the event policy, circumstances, WiPay processing, and applicable law.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Discover" title="Timeline and following stores">
        <FaqItem question="What is Timeline?">Timeline is LinkWe&apos;s visual discovery feed. Customers can search posts and ads, view photo carousels, follow stores, like, comment, reply, share, and open attached products, services, events, tickets, or collaborating businesses.</FaqItem>
        <FaqItem question="Which businesses can publish Timeline posts?">Timeline publishing is currently available to stores with an active Growth or Pro plan. Customers see eligible posts from businesses across the platform, including stores they follow.</FaqItem>
        <FaqItem question="Can I control Timeline notifications?">Like, comment, reply, follow, order, booking, and other relevant alerts may appear in LinkWe. Push notifications require browser or device permission and can be turned off in your browser, device, or applicable LinkWe settings.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Build on LinkWe" title="Vendors, plans and Rex">
        <FaqItem question="How do I start selling?">Create a business account, complete onboarding and verification, set up the store, choose a plan, configure fulfilment, and publish accurate listings. The store becomes sellable after the required approval and account conditions are met.</FaqItem>
        <FaqItem question="What are the current vendor plans?"><Link href="/pricing" className="font-bold text-[#D4450A] hover:underline">Starter</Link> is currently free with transaction commission and listing limits. Growth is currently TTD 300 monthly with lower product commission, no service commission, Timeline access, and 300 Rex uses monthly. Pro is currently TTD 500 monthly with no product or service commission, Timeline access, and 1,000 Rex uses monthly. Event tickets currently carry 6% commission on every plan.</FaqItem>
        <FaqItem question="What is Rex?">Rex is LinkWe&apos;s AI business assistant. It can help draft products, services, events, and Timeline posts, work with permitted images and existing marketplace content, and answer operational questions. Always review generated facts, prices, policies, images, and actions before publishing or relying on them.</FaqItem>
        <FaqItem question="How do vendors get paid?">Eligible earnings build in the LinkWe balance after the relevant order, booking, subscription, or ticket fulfilment rules are met. Vendors request payout to verified bank details, subject to available balance, the displayed minimum, refunds, disputes, fraud review, and lawful holds.</FaqItem>
        <FaqItem question="Can a vendor change plans?">Growth and Pro are managed from the vendor finance area. Cancellation stops future periods according to the displayed billing flow and does not automatically refund a current period. The live Pricing page controls current plan prices, limits, and commission.</FaqItem>
      </FaqGroup>

      <FaqGroup kicker="Your account" title="Safety, privacy and support">
        <FaqItem question="How do I stay safe on LinkWe?">Keep payment inside LinkWe, never share passwords or one-time codes, review seller and listing details, keep order records, protect ticket QR codes, and report suspicious activity. Card entry occurs through WiPay—not through Messages or Timeline.</FaqItem>
        <FaqItem question="What information is public?">Published stores, listings, events, reviews, Timeline posts, photos, comments, replies, likes, and related profile activity may be public. Delivery addresses, payment information, private messages, verification documents, and vendor bank details are not displayed publicly.</FaqItem>
        <FaqItem question="How do I contact LinkWe?">Use the <Link href="/contact" className="font-bold text-[#D4450A] hover:underline">contact page</Link> or email <a href="mailto:admin@linkwemall.com" className="font-bold text-[#D4450A] hover:underline">admin@linkwemall.com</a>. Include the relevant order, booking, ticket, or store reference, but never email a password, card security code, or one-time code.</FaqItem>
      </FaqGroup>
    </PublicStaticPageShell>
  );
}
