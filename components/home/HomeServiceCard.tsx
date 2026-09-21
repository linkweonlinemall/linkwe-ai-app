import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { HomeItem } from "@/lib/home/types";
import HomeListingImage from "./HomeListingImage";
import styles from "./service-card.module.css";

export default function HomeServiceCard({ service, index }: { service: HomeItem; index: number }) {
  return (
    <Link
      href={service.href}
      className={styles.card}
      data-service-tone={index % 3}
      aria-label={`${service.name} by ${service.brand} — view service`}
    >
      <div className={styles.photo}>
        <HomeListingImage src={service.image} alt={service.name} />
        {service.region && <span className={styles.location}><MapPin size={13} aria-hidden />{service.region}</span>}
      </div>
      <div className={styles.copy}>
        <p className={styles.brand}>{service.brand}</p>
        <h3>{service.name}</h3>
        <div className={styles.footer}>
          <div><strong className={styles.price}>{service.priceLabel}</strong><span className={styles.action}>View service</span></div>
          <span className={styles.arrow}><ArrowUpRight size={23} aria-hidden /></span>
        </div>
      </div>
    </Link>
  );
}
