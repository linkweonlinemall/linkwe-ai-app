import type { Metadata } from "next";
import Link from "next/link";

import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How LinkWe Online Directory collects, uses, shares, stores, and protects information across its marketplace, Timeline, payments, delivery, and Rex AI tools.",
};

const collectedInformation = [
  ["Account and contact data", "Name, email address, telephone number, account role, authentication records, and communication preferences."],
  ["Business and verification data", "Store details, addresses, map pins, business information, identification or selfie documents, verification status, bank or payout details, and staff access records."],
  ["Marketplace and transaction data", "Carts, orders, split-vendor fulfilment records, delivery or pickup details, bookings, service requests, subscriptions, tickets, check-ins, refunds, disputes, balances, and payout records."],
  ["Content and communications", "Listings, store pages, Timeline posts, photos, tags, comments, replies, likes, follows, reviews, messages, support requests, and vendor checkout questions or customer responses."],
  ["Device and usage data", "IP address, browser or device details, session data, page activity, searches, interactions, crash or security logs, analytics identifiers, and push-notification subscription identifiers."],
  ["Location data", "The region, address, approximate location, or map coordinates you provide or permit for delivery, pickup, storefront maps, nearby discovery, or on-demand services."],
  ["Rex and AI data", "Prompts, uploaded images, selected marketplace content, generated drafts, tool requests, and feedback used to provide Rex or other AI-assisted features."],
] as const;

const uses = [
  "Create, authenticate, secure, and support accounts",
  "Publish stores, listings, events, services, and eligible Timeline content",
  "Process checkout, WiPay payments, refunds, subscriptions, and vendor payouts",
  "Coordinate orders, combined shipping, warehouse pickup, downloads, bookings, requests, tickets, and check-in",
  "Enable messages, reviews, follows, comments, alerts, email, and push notifications",
  "Provide Rex and other AI-assisted business tools at the user’s request",
  "Personalise discovery, measure performance, troubleshoot, prevent fraud and abuse, and improve LinkWe",
  "Enforce platform rules, resolve disputes, and comply with legal, accounting, safety, and regulatory obligations",
] as const;

export default function PrivacyPolicyPage() {
  return (
    <PublicStaticPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="This policy explains what LinkWe handles across shopping, selling, delivery, community features, and Rex—and the choices available to you."
      updated="11 September 2026"
      legal
    >
      <section>
        <h2 className="text-xl font-black text-zinc-900">1. Who we are and scope</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>LinkWe is a Trinidad and Tobago multi-vendor marketplace operated by <strong className="text-zinc-900">LinkWe Online Directory</strong>. This policy applies to LinkWe websites, installed web-app experiences, dashboards, Timeline, Rex, checkout, support, and related services that link to it.</p>
          <p>Questions or privacy requests may be sent to <a href="mailto:admin@linkwemall.com" className="font-bold text-[#D4450A] hover:underline">admin@linkwemall.com</a> or through our <Link href="/contact" className="font-bold text-[#D4450A] hover:underline">contact page</Link>.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">2. Information we collect</h2>
        <div className="mt-5 grid gap-3">
          {collectedInformation.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-white p-4">
              <h3 className="text-sm font-black text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm leading-7 text-zinc-600">We receive information directly from you, automatically from your device and use of LinkWe, from other users involved in a transaction, and from service providers such as payment, identity, mapping, analytics, communication, or delivery partners.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">3. How we use information</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {uses.map((item) => (
            <li key={item} className="flex items-start gap-2 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-600"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-gradient-to-r from-[#1A7FB5] to-[#D4450A]" />{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-7 text-zinc-600">Depending on the activity and applicable law, processing may be necessary to perform our agreement with you, comply with law, pursue legitimate marketplace and security interests, protect users, or act with your consent.</p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">4. Public and shared marketplace information</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Published store profiles, listings, events, reviews, Timeline posts, photos, search tags, comments, replies, likes, and similar community activity may be visible to other users or the public. Search engines or recipients of shared links may also retain copies.</p>
          <p>Transaction details are shared only as operationally necessary. A relevant vendor may receive the customer&apos;s name, order or booking details, vendor-specific checkout responses, delivery information, and contact details needed for fulfilment. LinkWe staff and assigned fulfilment partners may access the information needed to coordinate delivery, pickup, support, safety, or disputes.</p>
          <p>Do not publish sensitive information in public content or send card details, passwords, or one-time codes through Timeline, reviews, or Messages.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">5. Service providers and disclosures</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p><strong className="text-zinc-900">Payments:</strong> WiPay processes card payments, enrolments, payment confirmations, and refunds. LinkWe stores transaction references and status information, not full card numbers or card security codes.</p>
          <p><strong className="text-zinc-900">Hosting and operations:</strong> Infrastructure, database, file or image storage providers—including Cloudinary where used—help host and deliver LinkWe content.</p>
          <p><strong className="text-zinc-900">Maps and sign-in:</strong> Google and/or Mapbox services may process search, map, geocoding, location, or authentication information when those features are used.</p>
          <p><strong className="text-zinc-900">Communications and analytics:</strong> Providers such as Resend, OneSignal, and Google Analytics may process email delivery, push identifiers, device activity, or usage measurements needed for the enabled feature.</p>
          <p><strong className="text-zinc-900">Artificial intelligence:</strong> AI providers may process Rex prompts, images, selected listing information, and generated responses to fulfil a request. Do not submit secrets or unnecessary personal data to Rex.</p>
          <p>We may also disclose information to professional advisers, insurers, acquirers in a business transaction, or public authorities when reasonably necessary to comply with law, establish or defend rights, investigate fraud, or protect people and the platform. We do not sell personal information.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">6. Cookies, local storage and analytics</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          LinkWe uses cookies and similar browser storage for sign-in, session security, carts, preferences, app functionality, fraud prevention, and performance measurement. Where configured, Google Analytics helps us understand visits and feature usage. Browser controls can block or clear storage, but essential account and checkout functions may then stop working. Push notifications are optional and can be disabled in your browser, device, or LinkWe settings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">7. Retention</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          We keep information for as long as reasonably needed to provide LinkWe and for security, fraud prevention, fulfilment, support, dispute resolution, accounting, payout, tax, legal, and audit purposes. Retention differs by record type. Public content may remain until deleted, archived, or removed; backups and transaction records may remain longer where reasonably required. A deletion request does not require deletion of information that LinkWe must or is permitted to retain.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">8. Your choices and requests</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Subject to applicable law and verification of your request, you may ask to access or correct personal information, delete eligible information or close your account, withdraw consent where processing depends on it, or opt out of non-essential communications.</p>
          <p>You can manage some profile, notification, subscription, and content settings from your dashboard. To make a broader request, email <a href="mailto:admin@linkwemall.com" className="font-bold text-[#D4450A] hover:underline">admin@linkwemall.com</a>. We may need to confirm your identity and may preserve records where required for transactions, disputes, security, or law.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">9. Security and account responsibility</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          LinkWe uses measures intended to protect information, including encrypted transport, password hashing, access controls, payment-provider separation, and operational monitoring. No service can guarantee absolute security. Use a strong unique password, protect verification codes, review account activity, and contact us promptly if you suspect unauthorised access.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">10. International processing and children</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-zinc-600">
          <p>Some providers may process or store information outside Trinidad and Tobago. When this occurs, information is handled under the provider arrangements and safeguards applicable to the service.</p>
          <p>LinkWe accounts and vendor tools are intended for people aged 18 or older. We do not knowingly invite children to register. If you believe a child supplied personal information, contact us for review.</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-zinc-900">11. Changes and governing framework</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          We may update this policy as LinkWe changes or legal requirements develop. The effective date above identifies the current version. Material changes may also be communicated through LinkWe or email. This policy is intended to operate consistently with applicable Trinidad and Tobago law, including the provisions of the Data Protection Act, 2011 that are in force.
        </p>
      </section>
    </PublicStaticPageShell>
  );
}
