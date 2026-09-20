import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BarChart3, MessageCircle, PackagePlus, Sparkles } from "lucide-react";
import styles from "./home.module.css";

export default function HomeRex({ href, isVendor }: { href: string; isVendor: boolean }) {
  return (
    <section className={`${styles.container} ${styles.rexSection}`} id="meet-rex" aria-labelledby="rex-title">
      <div className={styles.rexWelcome}>
        <span className={styles.rexLabel}><Sparkles size={17} aria-hidden /> MEET REX. YOUR AI BUSINESS ASSISTANT.</span>
        <h2 id="rex-title">A big idea?<br /><span>Rex is ready.</span></h2>
        <p>Your ambition. A little extra intelligence. Meet the sidekick helping local businesses turn <strong>“what if” into what’s next.</strong></p>
        <ul className={styles.rexSkills} aria-label="What Rex helps with">
          <li><PackagePlus size={18} aria-hidden /> Create listings</li>
          <li><MessageCircle size={18} aria-hidden /> Plan content</li>
          <li><BarChart3 size={18} aria-hidden /> Understand sales</li>
        </ul>
        <Link href={href} className={styles.rexButton}>{isVendor ? "Start a conversation" : "Discover Rex"}<ArrowUpRight size={21} aria-hidden /></Link>
        <span className={styles.rexWelcomeFoot}>Built for big dreams. And the people behind them.</span>
      </div>
      <div className={styles.rexWorld}>
        <span className={styles.rexOrbit} aria-hidden />
        <span className={styles.rexOrbitTwo} aria-hidden />
        <span className={styles.rexPlatform} aria-hidden />
        <Image className={styles.rexCharacter} src="/images/home/rex-3d-v1.webp" alt="Rex, LinkWe’s friendly 3D character, wearing his navy LinkWe polo and welcoming you with an open hand." width={1024} height={1536} sizes="(max-width: 700px) 320px, 480px" />
        <span className={styles.rexSpeech} aria-hidden><Sparkles size={17} /> Let’s build something.</span>
        <span className={styles.rexNameBadge} aria-hidden><span /> YOUR NEXT BIG ADVANTAGE</span>
      </div>
    </section>
  );
}
