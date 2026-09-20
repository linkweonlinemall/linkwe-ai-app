"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import HomeListingImage from "./HomeListingImage";
import WishlistButton from "@/components/ui/WishlistButton";
import type { HomeItem } from "@/lib/home/types";
import styles from "./home.module.css";

export default function HomeProductEdit({ items }: { items: HomeItem[] }) {
  const [selected, setSelected] = useState("All finds");
  const groups = ["All finds", ...Array.from(new Set(items.map((item) => item.group)))];
  const displayed = selected === "All finds" ? items : items.filter((item) => item.group === selected);

  return <>
    <div className={styles.editToolbar}><div className={styles.editFilters} role="group" aria-label="Filter featured products">{groups.map((group) => <button type="button" key={group} aria-pressed={selected === group} onClick={() => setSelected(group)} className={selected === group ? styles.filterActive : ""}>{group}</button>)}</div><span className={styles.editCount} aria-live="polite">{displayed.length} local {displayed.length === 1 ? "find" : "finds"}</span></div>
    <div className={styles.productGrid}>{displayed.slice(0, 6).map((item, index) => <article key={item.id} className={styles.productCard}>
      <div className={styles.productPhoto} data-tone={index % 4}><Link href={item.href} aria-label={`View ${item.name}`}><HomeListingImage src={item.image} alt={item.name} /></Link><span className={styles.productGroup}>{item.group}</span>{!item.preview && <div className={styles.saveProduct}><WishlistButton productId={item.id} initialWishlisted={!!item.saved} /></div>}<Link className={styles.productArrow} href={item.href} aria-label={`View ${item.name}`}><ArrowUpRight size={20} aria-hidden /></Link></div>
      <div className={styles.productDetails}><div><p>{item.brand}</p><h3><Link href={item.href}>{item.name}</Link></h3></div><strong>{item.priceLabel}</strong></div>
    </article>)}</div>
    {displayed.length > 6 && <Link href="/shop" className={styles.moreProducts}>Keep exploring the marketplace <ArrowUpRight size={17} aria-hidden /></Link>}
  </>;
}
