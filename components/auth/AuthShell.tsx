import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Heart, MapPin, ShoppingBag, Store } from "lucide-react";
import s from "./auth.module.css";

type Props = { children: ReactNode; eyebrow: string; title: string; description: string; business?: boolean };

export default function AuthShell({ children, eyebrow, title, description, business = false }: Props) {
  return <div className={s.page}>
    <header className={s.nav}>
      <Link href="/" className={s.logo} aria-label="LinkWe home"><Image src="/linkwe-logo-mark-on-light.png" alt="" width={48} height={48} priority/><span>LinkWe<span style={{color:"#a45b30"}}>.</span></span></Link>
      <Link href="/" className={s.navLink}>Back to the marketplace <ArrowUpRight size={15}/></Link>
    </header>
    <div className={s.layout}>
      <aside className={s.story} aria-label="Welcome to LinkWe">
        <Image className={s.photo} src="/images/home/local-boutique.webp" alt="" fill sizes="(min-width: 701px) 48vw, 1px" priority/>
        <div className={s.shade}/>
        <span className={s.storyTag}><MapPin size={13}/>Rooted in Trinidad & Tobago</span>
        <div className={s.storyCopy}>
          <h2>{business ? <>Your big idea.<br/><em>Your next chapter.</em></> : <>Your people.<br/><em>Your kind of place.</em></>}</h2>
          <p>{business ? "Bring what you do to the people who will love it. Your storefront, services and next opportunity start here." : "Discover the makers, everyday finds and local experiences that make these islands feel like home."}</p>
          <div className={s.storyFoot}><span><ShoppingBag size={15}/>Shop local</span><span><Heart size={15}/>Find your people</span><span><Store size={15}/>Grow your business</span></div>
        </div>
      </aside>
      <main className={s.content} key={title} id="auth-content">
        <p className={s.eyebrow}>{eyebrow}</p><h1 className={s.title}>{title}</h1><p className={s.description}>{description}</p>
        {children}
      </main>
    </div>
    <footer className={s.footer}><span>We people. We business. We marketplace.</span><div><Link href="/contact">Need a hand?</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
  </div>;
}
