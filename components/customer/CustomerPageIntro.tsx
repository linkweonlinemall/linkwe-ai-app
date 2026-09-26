import Link from "next/link";
import { LayoutDashboard, ArrowUpRight, PackageCheck, ShoppingBag, Sparkles, Ticket, CalendarDays } from "lucide-react";
import styles from "./customer.module.css";

type Page = "orders" | "cart" | "bookings" | "tickets";
const content = {
  orders: { eyebrow: "LOCAL FINDS. EVERY STEP OF THE WAY.", title: "Your good finds.", accent: "All in one place.", description: "Follow every parcel, find your downloads and keep the details close.", noun: "orders", tag: "from your local world", href: "/shop" },
  cart: { eyebrow: "A FEW GOOD FINDS. ALL YOURS.", title: "Good taste.", accent: "Great choices.", description: "A little something for you. A little love for local. Let’s make it yours.", noun: "items", tag: "in your good company", href: "/shop" },
  bookings: { eyebrow: "GOOD PEOPLE. TIME WELL SPENT.", title: "A little time.", accent: "Something great.", description: "Your appointments, the people behind them and every detail you need. Make time for local.", noun: "bookings", tag: "a little time, well spent", href: "/services" },
  tickets: { eyebrow: "GOOD TIMES. GREAT COMPANY.", title: "Be there.", accent: "Make a memory.", description: "Your next experience starts here. Keep your tickets close and your plans a little more exciting.", noun: "tickets", tag: "your way to good times", href: "/events" },
};
const links = [{ page: "orders", href: "/orders", text: "My orders", icon: PackageCheck }, { page: "cart", href: "/cart", text: "My cart", icon: ShoppingBag }, { page: "bookings", href: "/bookings", text: "My bookings", icon: CalendarDays }, { page: "tickets", href: "/my-tickets", text: "My tickets", icon: Ticket }];
export default function CustomerPageIntro({ page, count = 0 }: { page: Page; count?: number }) {
  const copy = content[page];
  const Icon = page === "bookings" ? CalendarDays : page === "tickets" ? Ticket : page === "cart" ? ShoppingBag : PackageCheck;
  return <>
    <nav className={styles.accountNav} aria-label="Your shopping">
      <Link href="/dashboard/customer"><LayoutDashboard size={17}/>My dashboard</Link>
      {links.map(link => <Link key={link.page} href={link.href} aria-current={page === link.page ? "page" : undefined}><link.icon size={17} />{link.text}</Link>)}
      <Link href={copy.href} className={styles.shopLink}>Keep exploring<ArrowUpRight size={16} /></Link>
    </nav>
    <header className={styles.hero} data-page={page}>
      <div><span className={styles.eyebrow}><span />{copy.eyebrow}</span><h1>{copy.title}<br /><em>{copy.accent}</em></h1><p>{copy.description}</p></div>
      <div className={styles.heroArt} aria-hidden="true"><span className={styles.artOrbit} />
        <div className={`${styles.bag} ${page === "bookings" ? styles.calendarArt : page === "tickets" ? styles.ticketArt : ""}`}>
          {page === "orders" || page === "cart" ? <span className={styles.handle} /> : null}
          {page === "bookings" ? <CalendarDays size={63} strokeWidth={1.2} /> : page === "tickets" ? <Ticket size={66} strokeWidth={1.2} /> : <Sparkles size={43} strokeWidth={1.35} />}
          <span>{page === "bookings" ? "make time for" : page === "tickets" ? "good times on" : "found on"}<br /><b>LinkWe.</b></span>
        </div>
        <span className={styles.artTag}><Icon size={20} /><span><strong>{count} {count === 1 ? copy.noun.slice(0, -1) : copy.noun}</strong><small>{copy.tag}</small></span></span><Sparkles className={styles.artSpark} size={24} />
      </div>
    </header>
  </>;
}
