"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X, Home, ShoppingBag, Store, Wrench, CalendarDays, Newspaper, Package, Heart, Bookmark, CalendarCheck, Ticket, MessageCircle, ClipboardList, Settings, LogOut, Download, Grid2X2, Tag, CircleHelp, Truck, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/(auth)/auth-actions";
import s from "./public-menu.module.css";
export default function PublicMenuDrawer({ open, onClose, user, loginHref, dashTarget, isInstalled }: {
  open: boolean; onClose: () => void; user: { name: string; href: string } | null; loginHref: string; dashTarget: string; isInstalled: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  useEffect(() => { if (previousPath.current !== pathname) { previousPath.current = pathname; onClose(); } }, [pathname,onClose]);
  const role = dashTarget.includes("/vendor") ? "Vendor" : dashTarget.includes("/admin") ? "Admin" : "Customer";
  const groups = [
    { label: "Discover LinkWe", links: [
      { href: "/", label: "Home", Icon: Home }, { href: "/shop", label: "Shop products", Icon: ShoppingBag }, { href: "/services", label: "Find services", Icon: Wrench }, { href: "/stores", label: "Explore stores", Icon: Store }, { href: "/events", label: "Events & tickets", Icon: CalendarDays }, { href: "/timeline", label: "Timeline", Icon: Newspaper },
    ]},
    ...(user ? [{ label: "Your shopping & activity", links: [
      { href: "/orders", label: "My orders", Icon: Package }, { href: "/bookings", label: "My bookings", Icon: CalendarCheck }, { href: "/my-tickets", label: "My tickets", Icon: Ticket }, { href: "/my-requests", label: "My requests", Icon: ClipboardList }, { href: "/wishlist", label: "Wishlist", Icon: Heart }, { href: "/saved-stores", label: "Saved stores", Icon: Bookmark }, { href: role === "Vendor" ? "/dashboard/vendor/messages" : "/messages", label: "Messages", Icon: MessageCircle },
    ]}] : []),
    { label: "Tools, plans & help", links: [
      { href: "/features", label: "All LinkWe features", Icon: Grid2X2 }, { href: "/pricing", label: "Plans & pricing", Icon: Tag }, { href: "/shipping-info", label: "Delivery & pickup", Icon: Truck }, { href: "/faq", label: "Help centre", Icon: CircleHelp }, ...(!isInstalled ? [{ href: "/get-app", label: "Install LinkWe", Icon: Download }] : []),
    ]},
  ];
  return <dialog ref={dialog} className={s.dialog} aria-labelledby="linkwe-menu-title" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={s.panel}>
      <div className={s.header}><p>WE PEOPLE. WE BUSINESS.</p><button type="button" aria-label="Close menu" onClick={onClose}><X size={21}/></button><h2 id="linkwe-menu-title">Your LinkWe.</h2><div className={s.identity}><span>{user ? user.name.trim().split(/\s+/).slice(0,2).map(part => part[0]).join("").toUpperCase() : <Store size={21}/>}</span><div><strong>{user?.name ?? "Welcome to the community"}</strong><p>{user ? `${role} account` : "Discover local. Create your next chapter."}</p></div></div><Link className={s.dashboard} href={user ? dashTarget : loginHref} onClick={onClose}><div><strong>{user ? "Open my dashboard" : "Sign in to LinkWe"}</strong><span>{user ? role === "Vendor" ? "Your store, tools and next steps" : role === "Admin" ? "Your management workspace" : "Your orders, bookings and favourites" : "Keep your favourites and activity together"}</span></div><ArrowUpRight size={21}/></Link></div>
      <div className={s.scroll}><nav aria-label="LinkWe menu">{groups.map(group => <section key={group.label}><h3>{group.label}</h3><div className={s.links}>{group.links.map(({href,label,Icon}) => <Link key={href} href={href} onClick={onClose} aria-current={pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`)) ? "page" : undefined}><Icon size={17}/><span>{label}</span><ArrowUpRight size={13}/></Link>)}</div></section>)}</nav>
      <div className={s.business}><Store size={21}/><div><strong>Make room for your business.</strong><Link href={role === "Vendor" && user ? "/dashboard/vendor/creation" : "/register/business"} onClick={onClose}>{role === "Vendor" && user ? "Open Creation Zone" : "Start selling on LinkWe"} →</Link></div></div>
      <div className={s.account}>{user && <><Link href={`${dashTarget}/settings`} onClick={onClose}><Settings size={16}/> Account settings</Link><form action={logoutAction}><button type="submit"><LogOut size={16}/> Sign out</button></form></>}<div><Link href="/privacy" onClick={onClose}><ShieldCheck size={13}/> Privacy</Link><Link href="/terms" onClick={onClose}>Terms</Link><Link href="/contact" onClick={onClose}>Contact</Link></div></div></div>
    </div>
  </dialog>;
}
