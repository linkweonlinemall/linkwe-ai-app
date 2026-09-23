import Link from "next/link";
import { ArrowUpRight, Clock3, ConciergeBell, MapPin, MessageCircle, Star, Store, WalletCards } from "lucide-react";
import WishlistButton from "@/components/ui/WishlistButton";
import ShopImage from "@/components/shop/ShopImage";
import { SERVICE_TYPE_LUCIDE } from "@/components/icons/service-type-lucide";
import { formatTTDPrice } from "@/lib/format/price";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { serviceMinutes, servicePrice, serviceResponseTime, serviceTypeInfo } from "@/lib/services/display";
import { directoryDuration, directoryLocation, type DirectoryService } from "@/lib/services/directory-query";
import styles from "./directory.module.css";

export function directoryServiceHref(service:DirectoryService){return `${service.preview?"https://www.linkweonlinemall.com":""}/service/${service.slug}`;}
export default function ServiceDirectoryCard({service,saved=false,index=0}:{service:DirectoryService;saved?:boolean;index?:number}){
  const href=directoryServiceHref(service),type=serviceTypeInfo(service.serviceType),TypeIcon=SERVICE_TYPE_LUCIDE[service.serviceType??""]??ConciergeBell;
  const pricing=servicePrice(service),minutes=serviceMinutes(directoryDuration(service));
  const location=directoryLocation(service);
  const locationLabel=({AT_CUSTOMER:"At your location",AT_VENDOR:"Visit the provider",FLEXIBLE:"Flexible location",VIRTUAL:"Online session"} as Record<string,string>)[location??""];
  const response=service.serviceType==="QUOTE"?serviceResponseTime(service.responseTime):null;
  const appointment=service.serviceType==="BOOKABLE"||service.serviceType==="VIRTUAL";
  return <article className={styles.card} data-tone={index%3}>
    <div className={styles.cardPhoto}><Link href={href} aria-label={`View ${service.name}`}><ShopImage src={service.images[0]} alt={service.name}/></Link><span className={styles.typeBadge}><TypeIcon size={13} aria-hidden/>{type.label}</span>{!service.preview&&<div className={styles.wishlist}><WishlistButton productId={service.id} initialWishlisted={saved}/></div>}{service.isFeatured&&<span className={styles.featured}>Featured</span>}</div>
    <div className={styles.cardContent}>
      <Link href={service.preview&&!service.store.slug?href:`${service.preview?"https://www.linkweonlinemall.com":""}/store/${service.store.slug}`} className={styles.provider}><Store size={13} aria-hidden/><span>{service.store.name}</span><ArrowUpRight size={12} aria-hidden/></Link>
      <h3><Link href={href}>{service.name}</Link></h3>
      {service.store.region&&<p className={styles.region}><MapPin size={12} aria-hidden/>{getRegionLabel(service.store.region)}</p>}
      <div className={styles.details}>{minutes&&<span><Clock3 size={13} aria-hidden/>{minutes}</span>}{locationLabel&&<span><MapPin size={13} aria-hidden/>{locationLabel}</span>}{response&&<span><MessageCircle size={13} aria-hidden/>{response}</span>}{service.serviceType==="SUBSCRIPTION"&&service.sessionsIncluded!=null&&<span>{service.sessionsIncluded} sessions per cycle</span>}{appointment&&service.requiresDeposit&&<span><WalletCards size={13} aria-hidden/>{service.depositAmount!=null?`${formatTTDPrice(service.depositAmount)} deposit`:"Deposit required"}</span>}</div>
      {service.reviewCount>0&&<p className={styles.rating}><Star size={14} fill="currentColor" aria-hidden/><strong>{service.reviewAvg.toFixed(1)}</strong><span>{service.reviewCount} {service.reviewCount===1?"review":"reviews"}</span></p>}
      <div className={styles.price}><strong>{pricing.label}</strong><span>{service.serviceType==="ON_DEMAND"?"Service price · check the details for any travel fee":pricing.note}</span></div>
      {appointment&&!service.isAvailable&&<p className={styles.unavailable}>Bookings currently paused</p>}
      <Link href={href} className={styles.cardAction}>{appointment&&!service.isAvailable?"View service":type.action}<ArrowUpRight size={18} aria-hidden/></Link>
    </div>
  </article>;
}
