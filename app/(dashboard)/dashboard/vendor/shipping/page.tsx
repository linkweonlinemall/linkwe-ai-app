import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, PackageCheck, Truck, MapPin } from "lucide-react";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

export default async function VendorShippingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/dashboard/vendor" className="inline-flex items-center gap-2 text-sm text-[#657a75] hover:text-[#D4450A]">
        <ArrowLeft size={16} aria-hidden /> Back to dashboard
      </Link>
      <header className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-[#eef5ec] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#D4450A]">Orders & fulfilment</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#163d3a]">Shipping & pickup</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#657a75]">
          Prepare your products and follow each order from your dashboard. LinkWe manages delivered orders and calculates the customer’s delivery charge at checkout.
        </p>
        <Link href="/dashboard/vendor/orders" className="mt-5 inline-flex min-h-11 items-center gap-3 rounded-xl bg-[#D4450A] px-5 py-3 text-sm font-bold text-white">
          Manage orders <ArrowUpRight size={17} aria-hidden />
        </Link>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { Icon: PackageCheck, title: "Prepare your orders", text: "Open an order to review its items, fulfilment method and next available action. Update its status after each step is completed." },
          { Icon: Truck, title: "LinkWe delivery", text: "Delivery charges are calculated from the destination and parcel details. Keep packaged weight and dimensions accurate on your product listings." },
          { Icon: MapPin, title: "Pickup & digital items", text: "Enable pickup on eligible products. Follow the fulfilment instructions on each order. Digital products use downloads and do not need physical shipping." },
        ].map(({ Icon, title, text }) => (
          <section key={title} className="rounded-2xl border border-[#e0e7de] bg-white p-6 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-[#D4450A]"><Icon size={22} aria-hidden /></span>
            <h2 className="mt-4 text-lg font-bold text-[#163d3a]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#657a75]">{text}</p>
          </section>
        ))}
      </div>
      <section className="rounded-2xl border border-[#e0e7de] bg-white p-6">
        <h2 className="text-lg font-bold text-[#163d3a]">Keep your delivery details ready</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { href: "/dashboard/vendor/products", label: "Product delivery details" },
            { href: "/dashboard/vendor/store/edit", label: "Store address & policies" },
            { href: "/shipping-info", label: "How LinkWe delivery works" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#aa390e] hover:bg-orange-100">
              {label} <ArrowUpRight size={16} aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
