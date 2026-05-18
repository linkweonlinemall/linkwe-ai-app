import type { Metadata } from "next";
import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { prisma } from "@/lib/prisma";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us · LinkWe",
  description: "Get in touch with the LinkWe team.",
};

export default async function ContactPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D4450A]">
            Get in touch
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold text-zinc-900">
            Contact us
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            We are here to help. Reach out and we will get back to you.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Contact info cards */}
          <div className="flex flex-col gap-4">
            {[
              {
                icon: "✉️",
                label: "Email us",
                value: "admin@linkwemall.com",
                href: "mailto:admin@linkwemall.com",
                desc: "We typically respond within 24 hours",
              },
              {
                icon: "🛍️",
                label: "For vendors",
                value: "Vendor support",
                href: "mailto:admin@linkwemall.com?subject=Vendor Support",
                desc: "Help with your store, listings, or payouts",
              },
              {
                icon: "📦",
                label: "Order issues",
                value: "Order support",
                href: "mailto:admin@linkwemall.com?subject=Order Issue",
                desc: "Problems with a delivery or purchase",
              },
              {
                icon: "🚗",
                label: "For couriers",
                value: "Courier support",
                href: "mailto:admin@linkwemall.com?subject=Courier Support",
                desc: "Help with assignments and payouts",
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-[#D4450A]">{item.value}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                </div>
              </a>
            ))}

            {/* Legal links */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                Legal
              </p>
              <div className="flex flex-col gap-2">
                <a href="/privacy" className="text-sm font-semibold text-zinc-700 hover:text-[#D4450A] transition-colors">
                  Privacy Policy →
                </a>
                <a href="/terms" className="text-sm font-semibold text-zinc-700 hover:text-[#D4450A] transition-colors">
                  Terms of Service →
                </a>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2">
            <ContactForm userEmail={user?.email ?? ""} userName={user?.fullName ?? ""} />
          </div>

        </div>
      </div>
    </div>
  );
}
