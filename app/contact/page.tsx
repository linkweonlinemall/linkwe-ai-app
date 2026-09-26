import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Package, Store, ShieldCheck } from "lucide-react";
import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import ContactForm from "./ContactForm";
export const metadata: Metadata = { title: "Contact LinkWe", description: "Get help with LinkWe orders, delivery, accounts, services, stores and payouts." };
export default async function ContactPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true, fullName: true } }) : null;
  return <PublicStaticPageShell eyebrow="A little help from LinkWe" title="Let’s work it out." subtitle="A question about an order, a hand with your store, or something else on your mind? You’re in the right place.">
    <section><h2>Find the quickest route</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{[
      { Icon: Package, title: "A purchase or delivery", text: "Start with your vendor conversation and keep your order reference handy.", href: "/orders", label: "Open my orders" },
      { Icon: Store, title: "Your business", text: "For store setup, verification, plan changes or payout support.", href: "mailto:admin@linkwemall.com?subject=Vendor%20support", label: "Email vendor support" },
      { Icon: ShieldCheck, title: "Privacy or your account", text: "Ask about your information, corrections or account closure.", href: "mailto:admin@linkwemall.com?subject=Privacy%20request", label: "Send a privacy request" },
      { Icon: Mail, title: "Everything else", text: "Send the team your question and any useful reference numbers.", href: "mailto:admin@linkwemall.com", label: "admin@linkwemall.com" },
    ].map(({Icon,title,text,href,label}) => <div key={title} className="rounded-2xl border border-[#dce3d5] bg-[#f5f7ef] p-5"><Icon size={21} className="text-[#6a805b]"/><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs text-zinc-600">{text}</p><Link href={href} className="mt-4 inline-block break-all text-xs font-semibold text-[#a74320]">{label} →</Link></div>)}</div></section>
    <section><h2>Send us a message</h2><p className="mb-5 mt-3 text-sm text-zinc-600">Include an order, booking, ticket or store reference where relevant. Please leave out passwords, ID documents, full card details and one-time codes.</p><ContactForm userEmail={user?.email ?? ""} userName={user?.fullName ?? ""}/></section>
  </PublicStaticPageShell>;
}
