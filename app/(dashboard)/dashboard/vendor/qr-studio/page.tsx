import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, QrCode, ScanLine } from "lucide-react";
import s from "./qr-studio.module.css";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LIVE_STOCK_COPY } from "@/lib/vendor/stock/copy";
import QrStudioClient from "./QrStudioClient";

export default async function VendorQrStudioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { name: true, slug: true, products: { where: { isPublished: true, isArchived: false }, select: { name: true, slug: true, isService: true }, orderBy: { name: "asc" } }, events: { where: { isPublished: true }, select: { title: true, slug: true }, orderBy: { startDate: "desc" } } } });
  if (!store) redirect("/onboarding/business/step-3");
  const origin = "https://www.linkweonlinemall.com";
  const destinations = [
    { group: "Store", label: `${store.name} storefront`, value: `${origin}/store/${store.slug}` },
    ...store.products.map((item) => ({ group: item.isService ? "Services" : "Products", label: item.name, value: `${origin}/${item.isService ? "service" : "products"}/${item.slug}` })),
    ...store.events.map((item) => ({ group: "Events", label: item.title, value: `${origin}/events/${item.slug}` })),
  ];
  return <div className={s.page}>
    <header className={s.header}><div><span className={s.eyebrow}><QrCode size={16}/>FROM YOUR SCREEN TO THEIR HANDS</span><h1>Good things are worth sharing.</h1><p>Turn a quick scan into a visit, a booking or your next sale.</p></div><Link href={`/store/${store.slug}`} target="_blank" rel="noreferrer">Visit your store <ArrowUpRight size={16}/></Link></header>
    <aside className={s.tip}><ScanLine size={22}/><div><strong>Your product labels work with Live Stock Update</strong><p>With an active Pro plan, scan these product labels to select quantities for a reviewed stock reduction. Creating and sharing QR Studio labels remains available on every plan. <Link href={LIVE_STOCK_COPY.href} className="font-semibold underline">Explore Live Stock Update</Link></p></div></aside>
    <QrStudioClient destinations={destinations} storeName={store.name}/>
  </div>;
}
