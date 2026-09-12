import type { Metadata } from "next";
import Link from "next/link";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Current terms for shopping, selling, services, events, Timeline, Rex, payments, delivery, and accounts on LinkWe.",
};

const vendorDuties = [
  "Provide accurate business, identity, payout, listing, price, stock, availability, delivery, cancellation, refund, licence, and event information",
  "Supply safe, lawful, authentic goods and services and hold all licences, permissions, insurance, tax registrations, and intellectual-property rights required for the business",
  "Honour confirmed orders, bookings, subscriptions, tickets, promotions, and collaborations, and communicate promptly when fulfilment is at risk",
  "Package physical products appropriately, follow the displayed fulfilment workflow, and hand parcels to LinkWe or an approved fulfilment partner when required",
  "Protect customer information and use it only for the relevant transaction, support, safety, or other lawful purpose",
  "Apply published policies consistently without limiting mandatory consumer rights",
] as const;

const prohibited = [
  "Illegal, unsafe, counterfeit, stolen, recalled, deceptive, infringing, or prohibited goods, services, events, or content",
  "Fraud, payment abuse, false orders, manipulation of ratings or engagement, fee avoidance, or moving a LinkWe transaction off-platform to evade applicable charges",
  "Harassment, threats, discrimination, impersonation, spam, malicious code, scraping, unauthorised automation, or interference with LinkWe",
  "Publishing another person’s sensitive information without authority or using customer information for unrelated marketing",
  "Misleading claims, undisclosed material terms, fabricated scarcity, or content that violates law or another person’s rights",
] as const;

export default function TermsOfServicePage() {
  return (
    <PublicStaticPageShell
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The rules that keep LinkWe’s marketplace, community, fulfilment, payments, and business tools useful and trustworthy."
      updated="11 September 2026"
      legal
    >
      <section>
        <h2 className="text-xl font-black text-zinc-900">1. Acceptance and eligibility</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>By accessing LinkWe, creating an account, publishing content, or completing a transaction, you agree to these Terms and our <Link href="/privacy" className="font-bold text-[#D4450A] hover:underline">Privacy Policy</Link>. If you do not agree, do not use LinkWe.</p>
          <p>You must be at least 18 years old and legally able to enter a binding agreement to hold an account. You must provide accurate information, keep credentials secure, and promptly report suspected unauthorised access. A person acting for a business confirms that they have authority to bind it.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">2. What LinkWe provides</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          LinkWe Online Directory operates a multi-vendor marketplace and business platform for products, digital goods, services, bookings, requests, subscriptions, events, tickets, storefronts, Timeline content, messaging, discovery, payments, and coordinated fulfilment. Vendors are independent businesses and are ordinarily the seller or service provider. LinkWe supplies the platform and may coordinate payment, support, delivery, pickup, verification, or dispute handling; it does not manufacture vendor goods or perform vendor services unless expressly stated.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">3. Customers and transactions</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>A customer must review the listing, seller, price, variants, availability, policies, fulfilment method, checkout questions, and order total before paying. Orders containing several vendors are divided into vendor portions for preparation while remaining part of the customer&apos;s main order.</p>
          <p>A transaction is not confirmed until LinkWe receives successful payment confirmation. Stock, capacity, tickets, appointments, and promotions may remain subject to availability. LinkWe or a vendor may cancel an order where payment fails, stock is unavailable, a listing or price is clearly erroneous, fraud is suspected, fulfilment is unsafe or impossible, or law requires it; any amount properly due back will be handled through the applicable refund process.</p>
          <p>Customers must provide accurate contact, delivery, map-pin, attendee, booking, and customisation information, be available for delivery or collection, inspect purchases reasonably promptly, and use products or services lawfully.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">4. Vendors</h2>
        <ul className="mt-4 grid gap-2">
          {vendorDuties.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#D4450A]" />{item}</li>
          ))}
        </ul>
        <div className="mt-4 space-y-3 text-sm leading-7 text-zinc-600">
          <p><strong className="text-zinc-900">Plans and commission:</strong> Starter is currently free with 15% product commission and 8% service commission; Growth is currently TTD 300 monthly with 5% product commission and no service commission; Pro is currently TTD 500 monthly with no product or service commission. Event tickets currently carry 6% commission on every plan. Product, service, Rex, placement, support, and other plan limits are shown on the <Link href="/pricing" className="font-bold text-[#D4450A] hover:underline">Pricing page</Link>, which controls if displayed pricing conflicts with this summary.</p>
          <p><strong className="text-zinc-900">Payouts:</strong> Eligible earnings enter the LinkWe balance under the applicable fulfilment rules. Payouts require verified bank details and are subject to the displayed minimum, available balance, refunds, chargebacks, disputes, fraud review, corrections, and lawful holds.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">5. Delivery, pickup and digital fulfilment</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Eligible physical orders use LinkWe&apos;s current coordinated fulfilment flow. Vendors prepare their portions, LinkWe may receive and combine parcels, and the customer selects available combined delivery or LinkWe warehouse pickup at checkout. Fees depend on the displayed quote and may reflect destination, weight, distance, and inter-island movement. Dates are estimates unless expressly guaranteed. Digital goods are delivered through the download flow after confirmed payment and remain subject to the listing&apos;s access, file, expiry, download, and licence terms. See <Link href="/shipping-info" className="font-bold text-[#D4450A] hover:underline">Shipping, Delivery & Pickup</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">6. Services, bookings and subscriptions</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Services may be bookable, quoted, on-demand, virtual, recurring, or otherwise described on the listing. The vendor controls the service description, eligibility, schedule, capacity, location, deposit, balance, cancellation window, and service-specific conditions, subject to law and LinkWe rules.</p>
          <p>Customers and vendors must attend, deliver, reschedule, cancel, or record completion honestly. Cancellation after a self-service window may require direct vendor assistance. A recurring subscription continues according to its displayed interval until it ends or is cancelled; cancellation for a future period does not automatically refund the current period.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">7. Events and tickets</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Event organisers are responsible for event accuracy, venue or stream access, capacity, permissions, safety, changes, cancellation, and the displayed refund policy. Tickets may include QR credentials and may be transferred only through available LinkWe tools and subject to restrictions. Do not duplicate, resell, or misuse a ticket or QR code. Refund eligibility follows the event terms and applicable law; WiPay may require a complete ticket-order transaction to be refunded.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">8. Timeline, Messages, reviews and user content</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Users retain ownership of content they submit. You grant LinkWe a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt for display, distribute, and promote that content as reasonably needed to operate and market LinkWe and the relevant store or listing. This licence ends when content is deleted, except for cached, backup, shared, transaction, moderation, or legal copies that reasonably remain.</p>
          <p>Timeline publishing is currently limited to stores with an active Growth or Pro plan; customers can discover eligible posts, follow stores, like, comment, reply, search, and share. LinkWe may rank, limit, label, moderate, archive, or remove content or engagement that violates these Terms, creates risk, or is misleading.</p>
          <p>Reviews must reflect genuine experience. Private messages are for legitimate marketplace communication; users must not send payment credentials, harmful content, spam, or unrelated marketing.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">9. Rex and AI-assisted features</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Rex can help vendors draft listings and Timeline posts, work with images and marketplace data, answer operational questions, and prepare actions. AI output may be incomplete, inaccurate, or unsuitable. The user must review prices, stock, policies, claims, images, attachments, recipients, and any proposed action before relying on or publishing it.</p>
          <p>Do not submit secrets, card data, unnecessary personal information, illegal content, or material you lack permission to use. LinkWe may apply usage allowances, top-up charges, safety limits, or feature changes shown in the product. Rex is not legal, financial, medical, tax, or other professional advice.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">10. Payments, refunds and chargebacks</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Prices are displayed in Trinidad and Tobago dollars unless stated otherwise. WiPay processes online card transactions, card enrolments where enabled, renewals, and refunds under its terms and availability. LinkWe does not store full card details. A bank or card issuer may apply separate conversion or service charges.</p>
          <p>Refunds, returns, booking cancellations, digital goods, subscriptions, and event tickets follow the applicable listing terms, LinkWe process, payment-provider limits, and mandatory consumer rights. A refund request is not complete until processed by the payment provider and financial institution. See <Link href="/returns" className="font-bold text-[#D4450A] hover:underline">Returns, Cancellations & Refunds</Link>.</p>
          <p>Users must contact LinkWe promptly before filing a chargeback where practical, must not seek duplicate recovery, and must cooperate with reasonable transaction verification. LinkWe may offset valid refunds, reversals, fees, or losses against a vendor balance where the governing transaction permits.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">11. Prohibited conduct</h2>
        <ul className="mt-4 grid gap-2">
          {prohibited.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl bg-red-50/60 px-4 py-3 text-sm leading-6 text-zinc-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-red-500" />{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">12. Platform changes, moderation and termination</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          LinkWe may update, suspend, restrict, or discontinue features; correct errors; reject or remove listings; withhold publication; reverse abusive engagement; require verification; or suspend or terminate access where reasonably necessary for security, legal compliance, payment risk, repeated poor fulfilment, policy violations, or protection of users. Where appropriate, we may give notice or an opportunity to correct the issue. Obligations concerning completed transactions, fees, payouts, refunds, licences, liability, and disputes survive account closure where applicable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">13. Disclaimers and liability</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>LinkWe is provided on an “as available” basis. To the maximum extent permitted by law, LinkWe does not guarantee uninterrupted operation, every vendor&apos;s conduct, the accuracy of all user content, or the quality, safety, legality, availability, or suitability of a vendor&apos;s offering.</p>
          <p>Nothing in these Terms excludes or limits a right, remedy, warranty, duty, or liability that cannot lawfully be excluded. Subject to that qualification, LinkWe is not liable for indirect, incidental, special, or consequential loss, or loss caused by a vendor, customer, organiser, courier, financial institution, force-majeure event, or misuse of the platform. Where liability can lawfully be limited, LinkWe&apos;s aggregate liability relating to the service will not exceed the greater of the amount the claimant paid directly to LinkWe in the preceding 12 months or the minimum amount required by law.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">14. Disputes and governing law</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          Contact the relevant vendor and LinkWe Support promptly, keep records, and allow a reasonable opportunity to investigate. Consumers may also seek assistance from the Trinidad and Tobago Consumer Affairs Division or another competent authority. These Terms are governed by the laws of Trinidad and Tobago, and disputes are subject to its courts unless applicable law requires otherwise.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">15. Changes and contact</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          We may update these Terms to reflect platform, operational, payment, or legal changes. The effective date above identifies the current version, and material changes may be communicated through LinkWe or email. Questions may be sent to <a href="mailto:admin@linkwemall.com" className="font-bold text-[#D4450A] hover:underline">admin@linkwemall.com</a> or through our <Link href="/contact" className="font-bold text-[#D4450A] hover:underline">contact page</Link>.
        </p>
      </section>
    </PublicStaticPageShell>
  );
}
