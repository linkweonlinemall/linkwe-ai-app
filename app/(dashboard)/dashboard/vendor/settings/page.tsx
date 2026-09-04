import Link from "next/link";
import { redirect } from "next/navigation";
import { IconBell, IconBuildingStore, IconChevronRight, IconCreditCard, IconLock, IconLogout, IconSettings, IconUser } from "@tabler/icons-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import PasswordForm from "@/components/settings/PasswordForm";
import ProfileForm from "@/components/settings/ProfileForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type SettingsTab = "account" | "security" | "business" | "billing";
type Props = { searchParams: Promise<{ tab?: string }> };

const tabs: Array<{ id: SettingsTab; label: string; Icon: typeof IconUser }> = [
  { id: "account", label: "Account", Icon: IconUser },
  { id: "security", label: "Security", Icon: IconLock },
  { id: "business", label: "Business", Icon: IconBuildingStore },
  { id: "billing", label: "Billing & access", Icon: IconCreditCard },
];

const SectionLink = ({ href, title, detail }: { href: string; title: string; detail: string }) => <Link href={href} className="group flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"><span className="min-w-0 flex-1"><strong className="block text-sm text-zinc-900">{title}</strong><span className="mt-0.5 block text-xs leading-5 text-zinc-500">{detail}</span></span><IconChevronRight className="size-5 shrink-0 text-zinc-300 group-hover:text-[#D4450A]"/></Link>;

export default async function VendorSettingsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  const query = await searchParams;
  const active = tabs.some((tab) => tab.id === query.tab) ? query.tab as SettingsTab : "account";
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, fullName: true, email: true, phone: true, region: true } });
  if (!user) redirect("/login");

  return <div className="min-w-0 overflow-x-hidden bg-[#F7F5F2] px-4 py-5 sm:px-6 sm:py-8">
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_88%_0%,rgba(232,130,12,.32),transparent_30%),linear-gradient(135deg,#181816,#2A241F_62%,#4B1D0C)] p-5 text-white shadow-2xl shadow-orange-950/10 sm:p-7"><div className="flex size-11 items-center justify-center rounded-2xl bg-[#D4450A] shadow-lg"><IconSettings className="size-5"/></div><h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">Settings</h1><p className="mt-1 max-w-xl text-sm leading-6 text-white/65">Manage your identity, account security, store operations and financial access in one place.</p></div>

      <nav data-tour="settings-tabs" className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm sm:grid-cols-4">{tabs.map(({id,label,Icon}) => <Link key={id} href={`/dashboard/vendor/settings?tab=${id}`} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:text-sm ${active === id ? "bg-[#1C1C1A] text-white shadow-md" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}><Icon className="size-4"/>{label}</Link>)}</nav>

      <div className="mt-5">
        {active === "account" ? <section data-tour="settings-profile" className="space-y-4"><div><h2 className="text-lg font-black text-zinc-950">Personal account</h2><p className="mt-1 text-xs leading-5 text-zinc-500">These details identify the person responsible for this vendor account. Public store details are managed separately.</p></div><ProfileForm user={user}/><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex gap-3"><IconBell className="mt-0.5 size-5 shrink-0 text-blue-600"/><div><h3 className="text-sm font-bold text-blue-950">Important account notices</h3><p className="mt-1 text-xs leading-5 text-blue-800">Order, booking, payout, verification and security messages are sent to <strong>{user.email}</strong>. Keep access to this inbox secure and current.</p></div></div></div></section> : null}

        {active === "security" ? <section data-tour="settings-security" className="space-y-4"><div><h2 className="text-lg font-black text-zinc-950">Password & session</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Use a unique password and sign out when working from a shared device.</p></div><PasswordForm/><div data-tour="settings-signout" className="rounded-2xl border border-red-100 bg-red-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-sm font-bold text-red-950">Sign out on this device</h3><p className="mt-1 text-xs text-red-700">This ends your current session without changing the store.</p></div><form action={logoutAction}><button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-100"><IconLogout className="size-4"/>Sign out</button></form></div></div></section> : null}

        {active === "business" ? <section className="space-y-4"><div><h2 className="text-lg font-black text-zinc-950">Business operations</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Control the public store and the operational rules customers rely on.</p></div><div className="grid gap-3 sm:grid-cols-2"><SectionLink href="/dashboard/vendor/store/edit" title="Store profile" detail="Branding, description, location, hours, policies and social links."/><SectionLink href="/dashboard/vendor/shipping" title="Delivery & pickup" detail="CSF courier workflow, distance pricing and local collection."/><SectionLink href="/dashboard/vendor/staff" title="Staff & availability" detail="Schedules, service assignments, closures and bookable time."/><SectionLink href="/dashboard/vendor/partners" title="Business partners" detail="Incoming, outgoing and active vendor partnerships."/><SectionLink href="/dashboard/vendor/products" title="Product catalogue" detail="Listings, variations, pricing, stock and publishing."/><SectionLink href="/dashboard/vendor/services" title="Service catalogue" detail="Bookings, quotes, subscriptions, virtual and on-demand work."/></div></section> : null}

        {active === "billing" ? <section className="space-y-4"><div><h2 className="text-lg font-black text-zinc-950">Billing, payouts & intelligence</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Manage the financial and reporting areas connected to the store.</p></div><div className="grid gap-3 sm:grid-cols-2"><SectionLink href="/dashboard/vendor/finance" title="Finance centre" detail="Available balance, pending release, commission and plan billing."/><SectionLink href="/dashboard/vendor/finance?tab=bank-details" title="Bank details" detail="Review the account used for approved vendor payouts."/><SectionLink href="/dashboard/vendor/finance?tab=payout-history" title="Payout history" detail="Track requested, pending and processed payouts."/><SectionLink href="/dashboard/vendor/reports" title="Business reports" detail="Sales trends, customers, completion and top products."/><SectionLink href="/dashboard/vendor/ai-assistant" title="Rex AI usage" detail="View AI allowance and use Rex for eligible business work."/><SectionLink href="/pricing" title="Plans & pricing" detail="Compare current LinkWe vendor plans and included features."/></div></section> : null}
      </div>
    </div>
  </div>;
}
