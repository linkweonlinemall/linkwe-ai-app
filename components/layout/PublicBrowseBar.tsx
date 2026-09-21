"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import HomeCategoryBrowser from "@/components/home/HomeCategoryBrowser";
import homeStyles from "@/components/home/home.module.css";
import styles from "./public-nav.module.css";

const links = [
  { href: "/", label: "Discover", matches: (path: string) => path === "/" },
  { href: "/shop", label: "Shop", matches: (path: string) => path.startsWith("/shop") || path.startsWith("/products/") },
  { href: "/services", label: "Services", matches: (path: string) => path.startsWith("/service") },
  { href: "/events", label: "Events", matches: (path: string) => path.startsWith("/event") },
  { href: "/stores", label: "Our stores", matches: (path: string) => path.startsWith("/store") },
  { href: "/timeline", label: "Timeline", matches: (path: string) => path.startsWith("/timeline") },
];

/** One navigation order across the marketplace; the homepage keeps its original palette. */
export default function PublicBrowseBar({ home = false }: { home?: boolean }) {
  const pathname = (usePathname() ?? "/")
    .replace(/^\/preview\/product\//, "/products/")
    .replace(/^\/preview\/service\//, "/service/")
    .replace(/^\/preview\/storefront\//, "/store/");
  const theme = home ? homeStyles : styles;
  return <div className={theme.browseBar}>
    <nav className={home ? homeStyles.container : styles.browseContainer} aria-label="Explore LinkWe">
      <HomeCategoryBrowser compact />
      <span className={theme.navDivider} aria-hidden />
      {links.map(link => <Link key={link.href} href={link.href} aria-current={link.matches(pathname) ? "page" : undefined} className={link.matches(pathname) ? theme.navActive : undefined}>{link.label}{link.href === "/timeline" && <span className={theme.newDot} />}</Link>)}
      <a href={home ? "#meet-rex" : "/#meet-rex"} className={theme.rexNav}><Sparkles size={14} aria-hidden />Meet Rex</a>
    </nav>
  </div>;
}
