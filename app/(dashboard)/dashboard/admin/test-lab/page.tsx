import Link from "next/link";
import { redirect } from "next/navigation";

import { disableAdminPaymentTestMode, enableAdminPaymentTestMode } from "@/app/actions/admin-test-mode";
import { isAdminPaymentTestMode } from "@/lib/admin/payment-test-mode";
import { getSession } from "@/lib/auth/session";
import { getWiPayEnvironment } from "@/lib/wipay/config";

const steps = [
  ["1", "Choose a product", "Add a physical product from an active store to your cart.", "/shop"],
  ["2", "Complete checkout", "Use this admin account as the test customer and continue to WiPay Sandbox.", "/checkout"],
  ["3", "Check the vendor order", "Sign in as the vendor and choose drop-off or collection from the new order.", "/dashboard/vendor/orders"],
  ["4", "Run warehouse operations", "Receive each parcel, assign a bay, combine, dispatch and confirm delivery.", "/dashboard/admin?tab=linkwe-delivery"],
  ["5", "Verify the records", "Confirm the customer order, vendor earnings and activity history all agree.", "/dashboard/admin?tab=orders"],
] as const;

export default async function AdminTestLabPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const enabled = await isAdminPaymentTestMode(session.userId);
  const defaultEnvironment = getWiPayEnvironment();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="overflow-hidden rounded-3xl bg-[#1C1C1A] p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Safe operations testing</p>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">LinkWe Test Lab</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Experience a complete purchase and fulfilment cycle without sending a real WiPay charge. Test mode applies only to this signed-in administrator for eight hours.
            </p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${enabled ? "bg-amber-300 text-amber-950" : "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25"}`}>
            <span className={`h-2 w-2 rounded-full ${enabled ? "bg-amber-700" : "bg-emerald-400"}`} />
            {enabled ? "SANDBOX TEST ACTIVE" : "NORMAL PAYMENT MODE"}
          </span>
        </div>
      </header>

      <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${enabled ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-950">WiPay purchase mode</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {enabled
                ? "Your product checkouts use WiPay Sandbox. Other customers remain on the site’s normal payment setting."
                : `Your checkouts use the configured ${defaultEnvironment} environment. Turn on sandbox before placing a test order.`}
            </p>
          </div>
          <form action={enabled ? disableAdminPaymentTestMode : enableAdminPaymentTestMode}>
            <button className={`min-h-12 rounded-xl px-5 text-sm font-bold text-white shadow-sm transition ${enabled ? "bg-zinc-900 hover:bg-zinc-700" : "bg-[#D4450A] hover:bg-[#B83A09]"}`}>
              {enabled ? "Exit sandbox mode" : "Turn on sandbox mode"}
            </button>
          </form>
        </div>
        {enabled ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 text-sm leading-6 text-amber-950">
            Test orders are clearly recorded as sandbox payments. Turn test mode off when finished. Never enter a real card on the sandbox page.
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4450A]">End-to-end checklist</p>
          <h2 className="mt-1 text-xl font-bold text-zinc-950">Test the same flow your team operates</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {steps.map(([number, title, description, href]) => (
            <Link key={number} href={href} className="group flex min-h-28 gap-4 rounded-2xl border border-zinc-200 p-4 transition hover:border-orange-200 hover:bg-orange-50/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1C1C1A] text-sm font-bold text-white">{number}</span>
              <span>
                <span className="block text-sm font-bold text-zinc-950">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500">{description}</span>
                <span className="mt-2 block text-xs font-bold text-[#D4450A]">Open step →</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/admin?tab=orders" className="rounded-2xl bg-white p-5 text-sm font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200">Order desk <span className="float-right text-[#D4450A]">→</span></Link>
        <Link href="/dashboard/admin?tab=linkwe-delivery&view=bays" className="rounded-2xl bg-white p-5 text-sm font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200">Warehouse bays <span className="float-right text-[#D4450A]">→</span></Link>
        <Link href="/dashboard/admin/guide" className="rounded-2xl bg-white p-5 text-sm font-bold text-zinc-900 shadow-sm ring-1 ring-zinc-200">Staff guide <span className="float-right text-[#D4450A]">→</span></Link>
      </section>
    </main>
  );
}
