import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Terms of Service · LinkWe",
  description: "Terms and conditions for using LinkWe — Trinidad and Tobago's multi-vendor marketplace.",
};

export default async function TermsOfServicePage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const unreadCount = await getNavUnreadCount();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4450A]">Legal</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-zinc-900">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: May 2026 · LinkWe Online Directory
          </p>
        </div>

        <div className="flex flex-col gap-8">

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">1. Acceptance of terms</h2>
            <p className="text-sm leading-7 text-zinc-600">
              By creating an account or using LinkWe, you agree to these Terms of Service and our{" "}
              <Link href="/privacy" className="font-semibold text-[#D4450A] hover:underline">
                Privacy Policy
              </Link>.
              These terms apply to all users including customers, vendors, and couriers.
              If you do not agree to these terms, do not use LinkWe.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">2. The LinkWe platform</h2>
            <p className="text-sm leading-7 text-zinc-600">
              LinkWe is a marketplace platform that connects customers with vendors and couriers in
              Trinidad and Tobago. LinkWe Online Directory acts as a platform operator and is not
              a party to transactions between customers and vendors. Vendors are independent businesses
              responsible for their own products, services, pricing, and fulfilment.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">3. Account registration</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
              <p>You must be at least 18 years old to create an account on LinkWe.</p>
              <p>You are responsible for maintaining the security of your account credentials.
              Do not share your password with anyone. Notify us immediately at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>{" "}
                if you suspect unauthorised access to your account.</p>
              <p>You may only create one account per person. Creating multiple accounts to circumvent
              suspensions or restrictions is prohibited.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">4. Vendor terms</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
              <p>By registering as a vendor on LinkWe, you agree to:</p>
              <ul className="ml-4 flex flex-col gap-2">
                {[
                  "Provide accurate and truthful information about your business, products, and services",
                  "Honour all orders and bookings made through the platform",
                  "Maintain accurate pricing, availability, and stock levels",
                  "Comply with all applicable laws in Trinidad and Tobago including consumer protection laws",
                  "Not list prohibited items including illegal goods, counterfeit products, or items that violate intellectual property rights",
                  "Respond to customer enquiries and disputes in a timely and professional manner",
                  "Accept that LinkWe may remove listings or suspend accounts that violate these terms",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
                    {item}
                  </li>
                ))}
              </ul>
              <p><strong className="text-zinc-900">Payouts:</strong> Vendor earnings are held by LinkWe and paid out according to the payout schedule. LinkWe deducts a platform commission from each transaction. Commission rates are communicated separately and may be updated with notice.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">5. Customer terms</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
              <p>As a customer on LinkWe, you agree to:</p>
              <ul className="ml-4 flex flex-col gap-2">
                {[
                  "Provide accurate delivery and contact information when placing orders",
                  "Pay for orders and bookings at the time of purchase",
                  "Not attempt to circumvent the platform by transacting directly with vendors to avoid fees",
                  "Use the platform respectfully and not submit false reviews or fraudulent orders",
                  "Understand that LinkWe is a marketplace and vendors are responsible for their own products and services",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
                    {item}
                  </li>
                ))}
              </ul>
              <p><strong className="text-zinc-900">Refunds and disputes:</strong> Refund requests must be submitted within 7 days of receiving an order. Contact us at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>{" "}
                and we will work with the vendor to resolve your issue.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">6. Courier terms</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
              <p>As a courier on LinkWe, you agree to:</p>
              <ul className="ml-4 flex flex-col gap-2">
                {[
                  "Provide accurate information about your vehicle and operating region",
                  "Accept and complete assigned deliveries in a timely and professional manner",
                  "Handle packages with care and deliver them in the condition received",
                  "Maintain a valid driver's licence and vehicle insurance",
                  "Not accept deliveries you cannot complete",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">7. Prohibited conduct</h2>
            <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
              <p>All users are prohibited from:</p>
              <ul className="ml-4 flex flex-col gap-2">
                {[
                  "Using LinkWe for any illegal purpose",
                  "Harassing, threatening, or abusing other users",
                  "Submitting false or misleading information",
                  "Attempting to hack, disrupt, or interfere with the platform",
                  "Scraping or copying platform content without permission",
                  "Impersonating another person or business",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">8. Payments</h2>
            <p className="text-sm leading-7 text-zinc-600">
              All payments on LinkWe are processed securely through Stripe. By making a payment,
              you agree to Stripe's terms of service. LinkWe does not store card details.
              Prices on LinkWe are displayed in Trinidad and Tobago Dollars (TTD) unless otherwise stated.
              International card payments may be subject to currency conversion by your card issuer.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">9. Limitation of liability</h2>
            <p className="text-sm leading-7 text-zinc-600">
              LinkWe Online Directory provides the platform on an "as is" basis. We are not liable for
              the quality, safety, or legality of items listed by vendors; the accuracy of vendor listings;
              the ability of vendors to complete transactions; or any losses arising from transactions
              between users. Our total liability to any user shall not exceed the amount paid by that user
              to LinkWe in the 12 months preceding the claim.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">10. Governing law</h2>
            <p className="text-sm leading-7 text-zinc-600">
              These terms are governed by the laws of Trinidad and Tobago. Any disputes arising from
              use of LinkWe shall be subject to the exclusive jurisdiction of the courts of
              Trinidad and Tobago.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">11. Changes to these terms</h2>
            <p className="text-sm leading-7 text-zinc-600">
              We may update these terms from time to time. We will notify registered users of material
              changes by email at least 14 days before they take effect. Continued use of LinkWe
              after changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-3 text-lg font-bold text-zinc-900">12. Contact</h2>
            <p className="text-sm leading-7 text-zinc-600">
              Questions about these terms? Contact LinkWe Online Directory at{" "}
              <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                admin@linkwemall.com
              </a>{" "}
              or visit our{" "}
              <Link href="/contact" className="font-semibold text-[#D4450A] hover:underline">
                contact page
              </Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
