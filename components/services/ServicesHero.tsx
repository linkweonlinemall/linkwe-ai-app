import Link from "next/link";
import { ArrowDown, ArrowUpRight, Sparkles } from "lucide-react";
import ShopImage from "@/components/shop/ShopImage";
import type { DirectoryService } from "@/lib/services/directory-query";
import { directoryServiceHref } from "./ServiceDirectoryCard";
import styles from "./directory.module.css";

export default function ServicesHero({services}:{services:DirectoryService[]}){
  return <section className={styles.hero} aria-labelledby="services-title"><div className={styles.heroCopy}><p className={styles.eyebrow}><span/>THE PEOPLE WHO MAKE IT HAPPEN</p><h1>Good people.<br/><em>Great at what they do.</em></h1><p>Get the look. Capture the moment. Bring your ideas to life.<br className={styles.desktopBreak}/> Find your kind of expert, right here in T&amp;T.</p><div className={styles.heroActions}><a href="#service-results">Find your person <ArrowDown size={17} aria-hidden/></a><Link href="/stores">Meet our local stores <ArrowUpRight size={16} aria-hidden/></Link></div><span className={styles.heroFoot}><Sparkles size={15} aria-hidden/>Local talent. A world of possibilities.</span></div>{services.length>0&&<div className={styles.heroGallery}>{services.slice(0,3).map((service,index)=><Link key={service.id} href={directoryServiceHref(service)} className={styles.heroPhoto} data-position={index}><ShopImage src={service.images[0]} alt={service.name} hero/><span><small>{service.store.name}</small><strong>{service.name}</strong><ArrowUpRight size={18} aria-hidden/></span></Link>)}</div>}</section>;
}
