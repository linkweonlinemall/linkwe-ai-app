import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Download, Instagram, Facebook } from "lucide-react";
import s from "./site-footer.module.css";
const groups = [
  { title: "Discover", links: [["/shop", "Shop products"], ["/services", "Find a service"], ["/stores", "Local stores"], ["/events", "Events & tickets"], ["/timeline", "Timeline"]] },
  { title: "Build with LinkWe", links: [["/features", "All features"], ["/pricing", "Plans & pricing"], ["/register/business", "Start your business"], ["/dashboard/vendor", "Vendor workspace"]] },
  { title: "We’re here to help", links: [["/faq", "Help centre"], ["/shipping-info", "Delivery & pickup"], ["/returns", "Returns & refunds"], ["/contact", "Contact our team"]] },
  { title: "Get to know us", links: [["/about", "Our story"], ["/privacy", "Privacy policy"], ["/terms", "Terms of service"], ["/cookies", "Cookies & storage"]] },
];
export default function SiteFooter() {
  return <footer className={`${s.footer} pb-mobile-public lg:pb-0`}><div className={s.wrap}><div className={s.top}><div><Link href="/" aria-label="LinkWe home"><Image src="/linkwe-logo-mark-on-dark.png" alt="LinkWe" width={65} height={65}/></Link><h2>Good things happen<br/>when we link up.</h2><p>We People. We Business. We Marketplace.</p></div><Link href="/get-app" className={s.install}><Download size={23}/><div><strong>A little more local, in your pocket.</strong><span>Install LinkWe on a supported device</span></div><ArrowUpRight size={20}/></Link></div><nav aria-label="Footer" className={s.links}>{groups.map(group => <div key={group.title}><h3>{group.title}</h3><ul>{group.links.map(([href,label]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></div>)}</nav><div className={s.bottom}><p>© {new Date().getFullYear()} LinkWe Online Directory. All rights reserved.</p><span>Made for Trinidad & Tobago.</span><div><a href="https://www.instagram.com/linkweonlinemall" target="_blank" rel="noopener noreferrer" aria-label="LinkWe on Instagram"><Instagram size={17}/></a><a href="https://www.facebook.com/linkweonlinemall" target="_blank" rel="noopener noreferrer" aria-label="LinkWe on Facebook"><Facebook size={17}/></a></div></div></div></footer>;
}
