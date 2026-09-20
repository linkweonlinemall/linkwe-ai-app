import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Bookmark, CalendarDays, Check, Heart, MapPin, MessageCircle, Package, Scissors, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Store, Ticket, Truck } from "lucide-react";
import { getWishlistProductIds } from "@/app/actions/wishlist";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { formatTTDPrice } from "@/lib/format/price";
import { formatEventCalendarDay } from "@/lib/events/format-datetime";
import type { HomeItem, HomeStore } from "@/lib/home/types";
import PublicNav from "@/components/layout/PublicNav";
import HomeCategoryBrowser from "@/components/home/HomeCategoryBrowser";
import HomeListingImage from "@/components/home/HomeListingImage";
import HomeShowcase from "@/components/home/HomeShowcase";
import HomeProductEdit from "@/components/home/HomeProductEdit";
import HomeRex from "@/components/home/HomeRex";
import styles from "@/components/home/home.module.css";

export const metadata: Metadata = {
  title: "LinkWe — Small islands. Big energy.",
  description: "We people. We business. We marketplace. Discover products, creative businesses, services and events from across Trinidad & Tobago.",
};

function productGroup(category: string | null) {
  if (category && /clothing|apparel|fashion|shoes|wear|accessories/.test(category)) return "Style";
  if (category && /beauty|skin|hair|personal_care|spa/.test(category)) return "Self-care";
  if (category && /gift|handmade|art_crafts|jewellery/.test(category)) return "Gifts";
  return "More to love";
}

export default async function Home() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const rexHref = user?.role === "VENDOR" ? "/dashboard/vendor/ai-assistant" : "/pricing";
  const [unreadCount, wishlistIds, productRows, serviceRows, storeRows, eventRows] = await Promise.all([
    getNavUnreadCount(),
    getWishlistProductIds(),
    prisma.product.findMany({
      where: { isPublished: true, isService: false, store: sellableStoreWhere() },
      select: { id: true, name: true, slug: true, price: true, images: true, hasVariants: true, category: true, store: { select: { name: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 12,
    }),
    prisma.product.findMany({
      where: { isPublished: true, isService: true, store: sellableStoreWhere() },
      select: { id: true, name: true, slug: true, price: true, images: true, serviceType: true, store: { select: { name: true, region: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }], take: 6,
    }),
    prisma.store.findMany({
      where: sellableStoreWhere(),
      select: { id: true, name: true, slug: true, tagline: true, logoUrl: true, coverPhotoUrl: true, region: true },
      orderBy: { createdAt: "desc" }, take: 6,
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", startDate: { gte: new Date() } },
      select: { id: true, title: true, slug: true, startDate: true, coverImage: true, store: { select: { name: true } } },
      orderBy: { startDate: "asc" }, take: 3,
    }),
  ]);

  let products: HomeItem[] = productRows.map((p) => ({
    id: p.id, name: p.name, brand: p.store.name, href: `/products/${p.slug}`, image: p.images[0] ?? null,
    priceLabel: `${p.hasVariants ? "From " : ""}${formatTTDPrice(p.price)}`, group: productGroup(p.category), saved: wishlistIds.includes(p.id),
  }));
  let services: HomeItem[] = serviceRows.map((s) => ({
    id: s.id, name: s.name, brand: s.store.name, href: `/service/${s.slug}`, image: s.images[0] ?? null,
    priceLabel: s.serviceType === "QUOTE" ? "Request a quote" : formatTTDPrice(s.price), group: "Services", region: getRegionLabel(s.store.region),
  }));
  let stores: HomeStore[] = storeRows.map((s) => ({
    id: s.id, name: s.name, href: `/store/${s.slug}`, image: s.coverPhotoUrl, logo: s.logoUrl, tagline: s.tagline, region: getRegionLabel(s.region),
  }));
  let events: HomeItem[] = eventRows.map((e) => {
    const { day, month } = formatEventCalendarDay(e.startDate);
    return { id: e.id, name: e.title, brand: e.store.name, href: `/events/${e.slug}`, image: e.coverImage, dateLabel: `${day} ${month}`, priceLabel: "View event details", group: "Events" };
  });

  // Public snapshot for this local design review only. Production always uses its database.
  // Preview listing links open their real public pages; no sample IDs reach purchase/save actions.
  if (process.env.NODE_ENV === "development") {
    const { default: preview } = await import("@/lib/home/live-preview.json");
    if (!products.length) products = preview.products;
    if (!services.length) services = preview.services;
    if (!stores.length) stores = preview.stores;
    if (!events.length) events = preview.events;
  }

  const portrait = services.find((s) => /portrait/i.test(s.name)) ?? services.find((s) => s.image);
  const islandTee = products.find((p) => /maracas/i.test(p.name)) ?? products.find((p) => p.image);
  const selfCare = products.find((p) => p.group === "Self-care") ?? products.find((p) => p.image && p.id !== islandTee?.id);
  const thirdSpotlight = services.find((s) => /nails/i.test(s.name)) ?? selfCare;
  const spotlights = [portrait, islandTee, thirdSpotlight].filter((item): item is HomeItem => !!item?.image).filter((item, index, items) => items.findIndex((i) => i.id === item.id) === index);
  const floatingFinds = [islandTee, selfCare].filter((item): item is HomeItem => !!item?.image);
  const featuredServices = services.slice(0, 3);
  const featuredEvent = events[0];
  const socialItems = [products[0], services.find((s) => /couples/i.test(s.name)) ?? services[0], products.find((p) => /sorrel/i.test(p.name)) ?? products[1]].filter((item): item is HomeItem => !!item?.image);

  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#home-content">Skip to content</a>
      <div className={styles.announcement}><div className={styles.container}><span><span className={styles.flag} aria-hidden /> THE ISLANDS. CONNECTED.</span><p>We people. We business. <strong>We marketplace.</strong></p><Link href="/get-app">Take LinkWe with you <ArrowUpRight size={12} aria-hidden /></Link></div></div>
      <PublicNav appearance="home" logoVariant="wordmark" user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null} dashboardHref={continueHref ?? undefined} unreadCount={unreadCount} />
      <div className={styles.browseBar}><nav className={styles.container} aria-label="Explore LinkWe"><HomeCategoryBrowser compact /><span className={styles.navDivider} aria-hidden /><Link href="/" aria-current="page" className={styles.navActive}>Discover</Link><Link href="/shop">Shop</Link><Link href="/services">Services</Link><Link href="/events">Events</Link><Link href="/stores">Our stores</Link><Link href="/timeline">Timeline<span className={styles.newDot} /></Link><a href="#meet-rex" className={styles.rexNav}><Sparkles size={14} aria-hidden /> Meet Rex</a></nav></div>

      <main id="home-content" tabIndex={-1}>
        <div className={styles.heroShell}><div className={styles.container}><HomeShowcase items={spotlights} extras={floatingFinds} /></div></div>
        <div className={styles.portalShell}><div className={`${styles.container} ${styles.portalGrid}`}>
          {[
            { label: "Find your next favourite", caption: "SHOP THE MARKETPLACE", href: "/shop", Icon: ShoppingBag, tone: "mint" },
            { label: "Put local talent to work", caption: "BOOK A SERVICE", href: "/services", Icon: Scissors, tone: "peach" },
            { label: "Make a few more memories", caption: "DISCOVER EVENTS", href: "/events", Icon: Ticket, tone: "lilac" },
            { label: "Get to know our people", caption: "EXPLORE LOCAL STORES", href: "/stores", Icon: Store, tone: "yellow" },
          ].map((item) => <Link key={item.href} href={item.href} className={styles.portalCard} data-tone={item.tone}><span className={styles.portalIcon}><item.Icon size={28} strokeWidth={1.5} aria-hidden /></span><span><small>{item.caption}</small><strong>{item.label}</strong></span><ArrowUpRight size={17} aria-hidden /></Link>)}
        </div></div>

        <section className={`${styles.container} ${styles.section}`} id="the-local-edit" aria-labelledby="edit-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span /> THE LOCAL EDIT</p><h2 id="edit-title">Good finds. <span>Great energy.</span></h2><p className={styles.sectionDescription}>Real products. Independent businesses. A little something that feels like you.</p></div><Link className={styles.textLink} href="/shop">Shop everything <ArrowUpRight size={18} aria-hidden /></Link></div>
          {products.length > 0 ? <HomeProductEdit items={products} /> : <Link href="/shop" className={styles.emptyCollection}>Your next favourite is out there. Explore the marketplace <ArrowUpRight size={20} /></Link>}
          <div className={styles.categoryFooter}><div><Sparkles size={20} aria-hidden /><span>From everyday essentials to one-of-a-kind finds.</span></div><HomeCategoryBrowser /></div>
        </section>

        <div className={styles.cultureRibbon} aria-label="We people. We business. We marketplace."><span>WE PEOPLE.</span><Sparkles aria-hidden /><span>WE BUSINESS.</span><Sparkles aria-hidden /><span>WE MARKETPLACE.</span><Sparkles aria-hidden /><span className={styles.ribbonOutline} aria-hidden>ALL LOCAL.</span></div>

        <section className={`${styles.container} ${styles.servicesSection}`} aria-labelledby="services-title">
          <div className={styles.serviceIntro}><p className={styles.eyebrow}>LOCAL TALENT. REAL POSSIBILITIES.</p><h2 id="services-title">Good people.<br /><span>Great at <br />what they do.</span></h2><p>Get the look. Capture the moment. Leave it to someone who knows.</p><Link href="/services" className={styles.darkButton}>Find your person <ArrowUpRight size={18} aria-hidden /></Link><div className={styles.serviceIntroArt} aria-hidden><span /><Scissors size={43} strokeWidth={1.2} /><Sparkles size={25} /></div></div>
          {featuredServices.map((service, index) => <Link href={service.href} className={styles.serviceCard} key={service.id}><div className={styles.servicePhoto}><HomeListingImage src={service.image} alt={service.name} /><span className={styles.serviceNumber}>0{index + 1}</span><span className={styles.servicePhotoArrow}><ArrowUpRight size={21} aria-hidden /></span></div><div className={styles.serviceCardCopy}><span>{service.brand}</span><h3>{service.name}</h3><p><MapPin size={12} aria-hidden />{service.region}</p><strong>{service.priceLabel}<ArrowRight size={16} aria-hidden /></strong></div></Link>)}
        </section>

        <HomeRex href={rexHref} isVendor={user?.role === "VENDOR"} />

        <section className={styles.storesSection} aria-labelledby="stores-title"><div className={styles.container}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}><span /> THE HEART OF LINKWE</p><h2 id="stores-title">Big on passion.<br /><span>Brilliantly local.</span></h2></div><div className={styles.storeIntro}><p>Behind every great find is someone <br />building something of their own.</p><Link href="/stores" className={styles.lightTextLink}>Meet all our stores <ArrowUpRight size={18} aria-hidden /></Link></div></div>
          <div className={styles.storeGrid}>{stores.slice(0, 3).map((store, index) => <Link href={store.href} key={store.id} className={styles.storeCard} data-store-tone={index}><div className={styles.storeCover}><HomeListingImage src={store.image} alt={`${store.name} storefront`} /></div><div className={styles.storeIdentity}><div className={styles.storeLogo}><HomeListingImage src={store.logo} alt={`${store.name} logo`} /></div><span><small><MapPin size={11} aria-hidden />{store.region}</small><h3>{store.name}</h3></span><span className={styles.storeArrow}><ArrowUpRight size={23} aria-hidden /></span></div><p>{store.tagline}</p></Link>)}</div>
          {stores.length > 3 && <div className={styles.moreStores}><span>MORE PEOPLE TO KNOW</span>{stores.slice(3, 6).map((store) => <Link key={store.id} href={store.href}>{store.logo && <Image src={store.logo} alt="" width={32} height={32} />}<span>{store.name}</span><ArrowUpRight size={13} aria-hidden /></Link>)}</div>}
        </div></section>

        <section className={`${styles.container} ${styles.communitySection}`} aria-labelledby="community-title">
          <div className={styles.communityCopy}><span className={styles.communityTag}><span /> THE LINKWE TIMELINE</span><h2 id="community-title">Stay in the loop.<br /><span>Catch the culture.</span></h2><p>New drops, little obsessions, and the people behind them. Follow your favourite stores. Discover something worth sharing.</p><Link href="/timeline" className={styles.primaryButton}>Find your people <ArrowUpRight size={18} aria-hidden /></Link><div className={styles.communityFoot}><Heart size={16} aria-hidden /> A feed that feels like home.</div></div>
          <div className={styles.communityWall}>{socialItems.map((item, index) => <Link key={item.id} href={item.href} className={styles.communityPhoto} data-position={index}><HomeListingImage src={item.image} alt={item.name} /><span><small>{item.brand}</small><ArrowUpRight size={16} aria-hidden /></span></Link>)}<span className={styles.communitySticker} aria-hidden>ALL THE<br /><strong>LOCAL LOVE.</strong><Heart size={24} /></span></div>
        </section>

        <section className={`${styles.container} ${styles.eventSection}`} aria-labelledby="event-title"><div className={styles.eventCopy}><span className={styles.eventEyebrow}><Ticket size={16} aria-hidden /> OUTSIDE IS CALLING</span><h2 id="event-title">Less scrolling.<br /><span>More living.</span></h2><p>Find the fete. Make the plans. There’s a whole island of experiences waiting for you.</p><Link href="/events" className={styles.darkButton}>See what’s on <ArrowUpRight size={18} aria-hidden /></Link><span className={styles.eventSpark} aria-hidden>✳</span></div><div className={styles.eventFeature}>{featuredEvent ? <Link href={featuredEvent.href}><div className={styles.eventImage}><HomeListingImage src={featuredEvent.image} alt={featuredEvent.name} /></div><div className={styles.eventCaption}><span className={styles.eventDate}><CalendarDays size={16} aria-hidden />{featuredEvent.dateLabel}</span><h3>{featuredEvent.name}</h3><span className={styles.eventDetail}>See event details <ArrowUpRight size={18} aria-hidden /></span></div></Link> : <Link href="/events" className={styles.eventEmpty}><Ticket size={85} strokeWidth={1} aria-hidden /><h3>Your next good time starts here.</h3><span>Explore events <ArrowUpRight size={20} /></span></Link>}</div></section>

        <section className={`${styles.container} ${styles.sellerSection}`} aria-label="Grow with LinkWe"><Link href={user?.role === "VENDOR" ? "/dashboard/vendor" : "/register?role=vendor"} className={styles.sellerCard}><div><Store size={30} strokeWidth={1.4} aria-hidden /><span>BUILT FOR LOCAL AMBITION</span></div><h2>Your business.<br />Your next chapter.</h2><p>Join the people turning their passion into possibilities.</p><span className={styles.sellerCta}>{user?.role === "VENDOR" ? "Your vendor workspace" : "Start selling on LinkWe"}<ArrowUpRight size={22} aria-hidden /></span></Link></section>

        <section className={`${styles.container} ${styles.appSection}`} aria-labelledby="app-title"><div className={styles.appIcon}><Smartphone size={35} strokeWidth={1.3} aria-hidden /><Check size={13} aria-hidden /></div><div><p className={styles.eyebrow}>YOUR ISLAND. IN YOUR POCKET.</p><h2 id="app-title">Local goes wherever you go.</h2><p>Get LinkWe on iPhone, Android or desktop.</p></div><Link href="/get-app" className={styles.darkButton}>Get the free app <ArrowUpRight size={18} aria-hidden /></Link></section>
        <div className={`${styles.container} ${styles.bottomUtilities}`}><nav aria-label="Helpful links"><Link href="/orders"><Package size={16} aria-hidden /> My orders</Link><Link href="/wishlist"><Heart size={16} aria-hidden /> Wishlist</Link><Link href="/saved-stores"><Bookmark size={16} aria-hidden /> Saved stores</Link><Link href="/messages"><MessageCircle size={16} aria-hidden /> Messages</Link></nav><div><Link href="/shipping-info"><Truck size={16} aria-hidden /> Delivery &amp; pickup</Link><Link href="/shop"><ShieldCheck size={16} aria-hidden /> Secure checkout in TTD</Link></div></div>
      </main>
    </div>
  );
}
