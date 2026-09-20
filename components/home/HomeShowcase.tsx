"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";
import type { HomeItem } from "@/lib/home/types";
import styles from "./home.module.css";

function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotion = () => true;

export default function HomeShowcase({ items, extras }: { items: HomeItem[]; extras: HomeItem[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const playing = items.length > 1 && !paused && !hovering && !reducedMotion && visible && documentVisible;
  const current = items[active % Math.max(items.length, 1)];

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .2 });
    if (root.current) observer.observe(root.current);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % items.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, items.length]);

  function choose(index: number) {
    setActive((index + items.length) % items.length);
    setPaused(true);
  }

  return <section ref={root} className={styles.hero} aria-labelledby="hero-title" onFocusCapture={() => setPaused(true)}>
    <div className={styles.heroAtmosphere} aria-hidden><span /><span /><span /></div>
    <div className={styles.heroCopy}>
      <div className={styles.heroEyebrow}><span className={styles.flag} aria-hidden /> BORN IN TRINIDAD &amp; TOBAGO <span className={styles.heroEyebrowLine} /></div>
      <h1 id="hero-title">Small islands.<br /><span>Big <em>energy.</em></span><Sparkles className={styles.headlineSpark} aria-hidden /></h1>
      <p>Your people. Your next favourite. Your whole local world.<br className={styles.desktopBreak} /> Shop, book and discover the businesses that make us, <strong>we.</strong></p>
      <div className={styles.heroActions}><Link href="/shop" className={styles.primaryButton}>Explore the marketplace <ArrowUpRight size={19} aria-hidden /></Link><Link href="/stores" className={styles.heroSecondary}>Meet our people <ArrowRight size={17} aria-hidden /></Link></div>
      <a href="#meet-rex" className={styles.heroRexLink}>
        <span className={styles.heroRexAvatar}><Image src="/images/home/rex-3d-v1.webp" alt="" width={150} height={225} /></span>
        <span><strong>Say hello to Rex.</strong><span>Your AI business sidekick.</span></span>
        <ArrowUpRight size={19} aria-hidden />
      </a>
      <div className={styles.heroFoot}><a href="#the-local-edit"><ArrowDown size={15} aria-hidden /> YOUR NEXT GOOD FIND STARTS HERE</a><span>10° N / 61° W</span></div>
    </div>
    <div ref={stage} className={styles.heroStage} onMouseEnter={() => setHovering(true)} onMouseLeave={() => { setHovering(false); stage.current?.style.setProperty("--tilt-x", "0deg"); stage.current?.style.setProperty("--tilt-y", "0deg"); }} onPointerMove={(event) => { if (reducedMotion || event.pointerType !== "mouse") return; const rect = event.currentTarget.getBoundingClientRect(); stage.current?.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - .5) * 6}deg`); stage.current?.style.setProperty("--tilt-x", `${((event.clientY - rect.top) / rect.height - .5) * -5}deg`); }}>
      <div className={styles.stageRing} aria-hidden />
      <div className={styles.featureFrame} role="region" aria-roledescription="carousel" aria-label="The LinkWe spotlight">
        {items.map((item, index) => <Link key={item.id} href={item.href} className={`${styles.featureSlide} ${index === active ? styles.slideActive : ""} ${item.group === "Style" ? styles.slideProduct : ""}`} aria-hidden={index !== active} tabIndex={index === active ? 0 : -1} aria-label={`${item.name} by ${item.brand}`}>
          {item.image && <Image src={item.image} alt={item.name} fill sizes="(max-width: 700px) 80vw, 420px" preload={index === 0} className={styles.featureImage} />}
          <div className={styles.featureShade} />
          <span className={styles.featureTopline}><span className={styles.liveDot} /> THE LOCAL SPOTLIGHT <span>0{index + 1}</span></span>
          <div className={styles.featureCaption}><span>{item.brand}</span><h2>{item.name}</h2><p>{item.priceLabel}</p><span className={styles.featureArrow}><ArrowUpRight size={23} aria-hidden /></span></div>
        </Link>)}
        {!items.length && <div className={styles.emptySpotlight}><Sparkles size={66} aria-hidden /><span>A world of local possibilities.</span><Link href="/stores">Explore local stores <ArrowUpRight size={20} /></Link></div>}
      </div>
      <div className={styles.heroSeal} aria-hidden><span>WE PEOPLE</span><Sparkles size={30} strokeWidth={1.5} /><span>WE POSSIBILITIES</span></div>
      {extras[0] && <Link href={extras[0].href} className={`${styles.floatingFind} ${styles.findOne}`}><div>{extras[0].image && <Image src={extras[0].image} alt={extras[0].name} fill sizes="100px" />}</div><span><small>ISLAND STATE OF MIND</small><strong>{extras[0].brand}</strong><span>{extras[0].priceLabel} <ArrowUpRight size={14} aria-hidden /></span></span></Link>}
      {extras[1] && <Link href={extras[1].href} className={`${styles.floatingFind} ${styles.findTwo}`}><div>{extras[1].image && <Image src={extras[1].image} alt={extras[1].name} fill sizes="80px" />}</div><span><small>{extras[1].group === "Self-care" ? "A LITTLE SELF-CARE" : "A LOCAL FAVOURITE"}</small><strong>{extras[1].name}</strong><span>{extras[1].priceLabel} <ArrowUpRight size={14} aria-hidden /></span></span></Link>}
      {items.length > 1 && <div className={styles.slideControls}>
        <button type="button" aria-label="Previous spotlight" onClick={() => choose(active - 1)}><ChevronLeft size={16} /></button>
        <div className={styles.slideDots}>{items.map((item, index) => <button type="button" key={item.id} onClick={() => choose(index)} aria-label={`Show spotlight ${index + 1}: ${item.brand}`} aria-pressed={index === active} className={index === active ? styles.activeDot : ""}><span /></button>)}</div>
        <button type="button" aria-label="Next spotlight" onClick={() => choose(active + 1)}><ChevronRight size={16} /></button>
        {!reducedMotion && <button type="button" aria-label={paused ? "Play spotlight slideshow" : "Pause spotlight slideshow"} onClick={() => setPaused(!paused)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>}
        <span className="sr-only" aria-live={playing ? "off" : "polite"}>{current?.name}</span>
      </div>}
    </div>
  </section>;
}
