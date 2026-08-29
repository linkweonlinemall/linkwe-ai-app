import Link from "next/link";
import { redirect } from "next/navigation";
import { IconQrcode } from "@tabler/icons-react";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import QrStudioClient from "./QrStudioClient";

export default async function VendorQrStudioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { name: true, slug: true, products: { where: { isAvailable: true }, select: { name: true, slug: true }, orderBy: { name: "asc" } }, services: { where: { isPublished: true }, select: { title: true, slug: true }, orderBy: { title: "asc" } }, events: { where: { isPublished: true }, select: { title: true, slug: true }, orderBy: { startDate: "desc" } } } });
  if (!store) redirect("/onboarding/business/step-3");
  const origin = "https://www.linkweonlinemall.com";
  const destinations = [
    { group: "Store", label: `${store.name} storefront`, value: `${origin}/store/${store.slug}` },
    ...store.products.map((item) => ({ group: "Products", label: item.name, value: `${origin}/products/${item.slug}` })),
    ...store.services.map((item) => ({ group: "Services", label: item.title, value: `${origin}/service/${item.slug}` })),
    ...store.events.map((item) => ({ group: "Events", label: item.title, value: `${origin}/events/${item.slug}` })),
  ];
  return <div className="min-h-full overflow-x-hidden bg-[#F7F5F2] px-4 py-5 sm:px-6 sm:py-8"><div className="mx-auto max-w-6xl"><Link href="/dashboard/vendor" className="text-sm font-medium text-zinc-500 hover:text-zinc-900">← Back to dashboard</Link><header className="my-5 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_90%_0%,rgba(232,130,12,.38),transparent_32%),linear-gradient(135deg,#181816,#4A1C0B)] p-6 text-white shadow-xl sm:p-8"><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10"><IconQrcode className="size-7 text-orange-300"/></span><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">Share and scan</p><h1 className="mt-1 text-2xl font-black sm:text-4xl">QR Studio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Create polished QR codes for anything you publish on LinkWe.</p></div></div></header><QrStudioClient destinations={destinations} storeName={store.name}/></div></div>;
}
