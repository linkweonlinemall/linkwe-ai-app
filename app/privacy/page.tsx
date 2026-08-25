import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Privacy Policy · LinkWe",
  description: "How LinkWe Online Directory collects, uses, and protects your personal information.",
};

export default async function PrivacyPolicyPage() {
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
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4450A]">Legal</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-zinc-900">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: May 2026 · LinkWe Online Directory
          </p>
        </div>

        <div className="prose prose-zinc max-w-none">
          <div className="flex flex-col gap-8">

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">1. Who we are</h2>
              <p className="text-sm leading-7 text-zinc-600">
                LinkWe is an online multi-vendor marketplace operated by <strong>LinkWe Online Directory</strong>,
                a company registered in Trinidad and Tobago. We connect local vendors with customers
                across Trinidad and Tobago.
              </p>
              <p className="mt-3 text-sm leading-7 text-zinc-600">
                For any privacy-related questions, contact us at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">2. Information we collect</h2>
              <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
                <p><strong className="text-zinc-900">Account information:</strong> When you register, we collect your full name, email address, phone number, and role (customer, vendor, or courier).</p>
                <p><strong className="text-zinc-900">Profile information:</strong> Vendors provide business details including store name, address, region, and bank account information for payouts. Couriers provide vehicle type and operating region.</p>
                <p><strong className="text-zinc-900">Transaction data:</strong> We collect order details, payment records, booking information, and delivery data to process and fulfill your transactions.</p>
                <p><strong className="text-zinc-900">Communications:</strong> Messages sent through our platform, reviews you submit, and support requests you send to us.</p>
                <p><strong className="text-zinc-900">Usage data:</strong> We collect information about how you use LinkWe, including pages visited, searches performed, and features used, to improve our service.</p>
                <p><strong className="text-zinc-900">Location data:</strong> When you use on-demand services, we may collect your approximate location with your permission to connect you with nearby providers.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">3. How we use your information</h2>
              <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
                <p>We use your information to:</p>
                <ul className="ml-4 flex flex-col gap-2 text-zinc-600">
                  {[
                    "Create and manage your account",
                    "Process orders, bookings, and payments",
                    "Connect customers with vendors and couriers",
                    "Send transactional emails about your orders and bookings",
                    "Calculate and process vendor and courier payouts",
                    "Prevent fraud and ensure platform security",
                    "Improve and personalise your experience on LinkWe",
                    "Comply with legal obligations in Trinidad and Tobago",
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
              <h2 className="mb-3 text-lg font-bold text-zinc-900">4. Sharing your information</h2>
              <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
                <p>We do not sell your personal information. We share information only in these circumstances:</p>
                <p><strong className="text-zinc-900">Vendors and couriers:</strong> When you place an order, your name, delivery address, and contact details are shared with the relevant vendor and assigned courier to fulfil your order.</p>
                <p><strong className="text-zinc-900">Payment processors:</strong> We use WiPay to process online payments. Your card details are handled directly by WiPay and are never stored on LinkWe servers.</p>
                <p><strong className="text-zinc-900">Service providers:</strong> We use trusted third-party services including Cloudinary for image storage and Mapbox for mapping features. These providers process data only as needed to provide their services.</p>
                <p><strong className="text-zinc-900">Legal requirements:</strong> We may disclose your information if required by law or to protect the rights and safety of our users and platform.</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">5. Data retention</h2>
              <p className="text-sm leading-7 text-zinc-600">
                We retain your account information for as long as your account is active. Transaction records are
                kept for a minimum of seven years to comply with financial regulations in Trinidad and Tobago.
                You may request deletion of your account and personal data by contacting us at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>.
                Note that some data may be retained to comply with legal obligations or resolve disputes.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">6. Your rights</h2>
              <div className="flex flex-col gap-3 text-sm leading-7 text-zinc-600">
                <p>You have the right to:</p>
                <ul className="ml-4 flex flex-col gap-2 text-zinc-600">
                  {[
                    "Access the personal information we hold about you",
                    "Correct inaccurate or incomplete information",
                    "Request deletion of your personal data",
                    "Opt out of non-essential communications",
                    "Withdraw consent where processing is based on consent",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4450A]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p>To exercise any of these rights, email us at{" "}
                  <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                    admin@linkwemall.com
                  </a>.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">7. Security</h2>
              <p className="text-sm leading-7 text-zinc-600">
                We implement industry-standard security measures to protect your personal information,
                including encrypted data transmission (HTTPS), secure password hashing, and access controls.
                However, no system is completely secure. If you believe your account has been compromised,
                contact us immediately at{" "}
                <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#D4450A] hover:underline">
                  admin@linkwemall.com
                </a>.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">8. Cookies</h2>
              <p className="text-sm leading-7 text-zinc-600">
                LinkWe uses essential cookies to keep you signed in and maintain your session.
                We do not use advertising or tracking cookies. You can disable cookies in your
                browser settings but this will prevent you from staying signed in to your account.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">9. Changes to this policy</h2>
              <p className="text-sm leading-7 text-zinc-600">
                We may update this Privacy Policy from time to time. We will notify registered users
                of significant changes by email. Continued use of LinkWe after changes are posted
                constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="mb-3 text-lg font-bold text-zinc-900">10. Contact us</h2>
              <p className="text-sm leading-7 text-zinc-600">
                For any privacy concerns or questions about this policy, contact LinkWe Online Directory at{" "}
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
    </div>
  );
}
