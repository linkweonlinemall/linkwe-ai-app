import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, Check, ChevronRight, Clock3, FileText, MapPin, MessageCircle, Sparkles, Star, Video, Zap } from "lucide-react";
import ServiceGallery from "./ServiceGallery";
import StorefrontImage from "@/components/storefront/StorefrontImage";
import StoreLocationCard from "@/components/storefront/StoreLocationCard";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getServiceCategoryLabel } from "@/lib/categories";
import { formatTTDPrice } from "@/lib/format/price";
import { getStoreLocation } from "@/lib/store/location";
import { serviceLocationLabel, serviceMinutes, servicePrice, serviceSpecifications, serviceTypeInfo, type ServiceDisplayData, type ServiceRecommendation } from "@/lib/services/display";
import shared from "@/components/product/product.module.css";
import styles from "./service-detail.module.css";

type Props = {
  service: ServiceDisplayData; nav: ReactNode; bookingAction: ReactNode; contactActions: ReactNode;
  reviews: ReactNode; reviewCount: number; averageRating: number; isVerified: boolean;
  isOwner?: boolean; featureAction?: ReactNode; linkedContent?: ReactNode;
  recommendations?: ServiceRecommendation[]; preview?: boolean;
};
export default function ServiceDetailView({ service, nav, bookingAction, contactActions, reviews, reviewCount, averageRating, isVerified, isOwner = false, featureAction, linkedContent, recommendations = [], preview = false }: Props) {
  const { store } = service;
  const storeHref = preview ? `/preview/storefront/${store.slug}` : `/store/${store.slug}`;
  const info = serviceTypeInfo(service.serviceType);
  const price = servicePrice(service);
  const specs = serviceSpecifications(service);
  const booked = service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL";
  const duration = serviceMinutes(booked ? service.durationMinutes || service.serviceDuration || 60 : service.serviceDuration);
  const hasServicePin = service.latitude != null && service.longitude != null && Math.abs(service.latitude) <= 90 && Math.abs(service.longitude) <= 180;
  const locationRecord = { name: store.name, region: store.region ?? "", ...(service.address || hasServicePin ? { address: service.address, latitude: service.latitude, longitude: service.longitude } : { address: store.address, latitude: store.latitude, longitude: store.longitude }) };
  const location = getStoreLocation(locationRecord);
  const showMap = service.serviceType !== "VIRTUAL" && service.serviceLocation !== "VIRTUAL" && (!!locationRecord.address || location.hasCoordinates);
  const TypeIcon = service.serviceType === "VIRTUAL" ? Video : service.serviceType === "ON_DEMAND" ? Zap : service.serviceType === "QUOTE" ? MessageCircle : CalendarDays;
  const response = service.responseTime || (service.serviceType === "ON_DEMAND" ? serviceMinutes(service.estimatedResponseMins) : null);
  const hasPolicies = !!service.returnPolicy || !!store.policies;

  return <div className={`${shared.page} ${styles.page}`}>
    {preview && <div className={shared.previewBar}><span>LOCAL DESIGN PREVIEW · Real vendor content · Requests disabled</span><Link href={`https://www.linkweonlinemall.com/service/${service.slug}`} target="_blank" rel="noopener noreferrer">View live service<ArrowUpRight size={12} aria-hidden /></Link></div>}
    {nav}
    <main className={shared.container}>
      <nav className={shared.breadcrumb} aria-label="Breadcrumb"><Link href="/services"><ArrowLeft size={15} aria-hidden />All services</Link><ChevronRight size={13} aria-hidden /><Link href={storeHref}>{store.name}</Link><ChevronRight size={13} aria-hidden /><span aria-current="page">{service.name}</span></nav>
      <div className={styles.hero}>
        <div className={styles.visual}>
          <ServiceGallery images={service.images} name={service.name} />

        </div>
        <div className={styles.summary}>
          <div className={styles.eyebrow}>{service.category && <span>{getServiceCategoryLabel(service.category)}</span>}{service.isFeatured && <span className={styles.featured}>Store pick</span>}</div>
          <h1>{service.name}<span>.</span></h1>
          <div className={styles.byline}><span className={styles.typePill}><TypeIcon size={14} aria-hidden />{info.label}</span>{reviewCount > 0 && <a href="#service-reviews"><Star size={14} aria-hidden />{averageRating.toFixed(1)}<span>({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span></a>}</div>
          {service.shortDescription && <p className={styles.introduction}>{service.shortDescription}</p>}
          <div className={styles.quickFacts}>
            {duration && <div><Clock3 size={18} aria-hidden /><span><small>SESSION</small><strong>{duration}</strong></span></div>}
            {(service.serviceLocation || service.serviceType === "VIRTUAL") && <div><MapPin size={18} aria-hidden /><span><small>WHERE WE MEET</small><strong>{service.serviceType === "VIRTUAL" ? "Online" : serviceLocationLabel(service.serviceLocation)}</strong></span></div>}
            {response && <div><MessageCircle size={18} aria-hidden /><span><small>{service.serviceType === "ON_DEMAND" ? "ESTIMATED RESPONSE" : "TYPICAL RESPONSE"}</small><strong>{response}</strong></span></div>}
          </div>
          <section className={styles.booking} id="service-booking" aria-labelledby="service-booking-title">
            <div className={styles.bookingHeading}><span><TypeIcon size={17} aria-hidden />YOUR NEXT STEP</span><ArrowUpRight size={20} aria-hidden /></div>
            <div className={styles.price}><strong>{price.label}</strong>{service.serviceType !== "QUOTE" && service.compareAtPrice != null && service.compareAtPrice > service.price && <del>{formatTTDPrice(service.compareAtPrice)}</del>}</div>
            <p className={styles.priceNote}>{price.note}</p>
            <h2 id="service-booking-title">{info.heading}</h2><p className={styles.bookingIntro}>{info.intro}</p>
            {booked && service.requiresDeposit && service.depositAmount != null && <p className={styles.notice}>{formatTTDPrice(service.depositAmount)} deposit required to book.</p>}
            {booked && service.requiresApproval && <p className={styles.notice}>Your booking requires the provider’s approval.</p>}
            {service.serviceType === "SUBSCRIPTION" && !!service.subscriptionTrialPeriod && <p className={styles.notice}>{service.subscriptionTrialPeriod}-day trial · {formatTTDPrice(service.subscriptionTrialPrice ?? 0)}</p>}
            {service.serviceType === "SUBSCRIPTION" && <a className={styles.termsLink} href="#service-details">View included sessions & subscription terms<ArrowUpRight size={14} aria-hidden /></a>}
            {service.serviceType === "ON_DEMAND" && <p className={styles.availability} data-available={store.isAvailableNow ?? false}><span />{store.isAvailableNow ? "Provider available now" : "Provider currently unavailable"}</p>}
            <div className={styles.bookingControls}>{bookingAction}</div>
          </section>
          <a className={styles.detailsPrompt} href="#service-details"><FileText size={15} aria-hidden />Everything to know before you book<ChevronRight size={16} aria-hidden /></a>
          <div className={styles.provider}>
            <Link href={storeHref} className={styles.providerLink}><div className={styles.logo}><StorefrontImage src={store.logoUrl} alt={`${store.name} logo`} /></div><span><small>THE PEOPLE BEHIND THE WORK</small><strong>{store.name}{isVerified && <BadgeCheck size={18} aria-label="Verified business" />}</strong>{store.region && <span><MapPin size={12} aria-hidden />{getRegionLabel(store.region)}</span>}</span><ArrowUpRight size={22} aria-hidden /></Link>
            <div className={styles.contact}>{contactActions}</div>{featureAction}
          </div>
        </div>
      </div>

      <nav className={shared.sectionNav} aria-label="Service information"><a href="#service-about"><FileText size={17} aria-hidden />The service</a><a href="#service-details"><Sparkles size={17} aria-hidden />The details</a>{showMap && <a href="#service-location"><MapPin size={17} aria-hidden />Location</a>}<a href="#service-reviews"><Star size={17} aria-hidden />Reviews{reviewCount > 0 && <span>{reviewCount}</span>}</a></nav>
      <div className={shared.detailsGrid}>
        <section className={`${shared.detailCard} ${shared.description} ${styles.anchor}`} id="service-about" aria-label="About this service">
          {service.description ? <ExpandableDescription title="A little about the service" description={service.description} /> : <><h2>A little about the service</h2><p>{service.shortDescription || "Speak with the provider to learn more about this service."}</p></>}
          {service.tags.length > 0 && <details className={shared.tags}><summary>Explore service tags <span>{service.tags.length}</span></summary><div>{service.tags.map(tag => <span key={tag}>{tag}</span>)}</div></details>}
        </section>
        <section className={`${shared.detailCard} ${styles.specCard} ${styles.anchor}`} id="service-details" aria-labelledby="service-details-title"><div className={shared.cardHeading}><Sparkles size={22} aria-hidden /><h2 id="service-details-title">The details, all here.</h2></div><dl className={shared.specifications}>{specs.length > 0 ? specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>) : <div><dt>Service type</dt><dd>{info.label}</dd></div>}</dl>{service.serviceType === "VIRTUAL" && service.virtualMeetingInfo && <div className={styles.meetingInfo}><h3>Joining your session</h3><p>{service.virtualMeetingInfo}</p></div>}</section>
      </div>
      <section className={styles.steps} aria-labelledby="service-steps-title"><div><p>FROM AN IDEA TO DONE</p><h2 id="service-steps-title">Good people.<br /><em>Great things ahead.</em></h2></div><ol>{info.steps.map(([title, description], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}<Check size={14} aria-hidden /></span><h3>{title}</h3><p>{description}</p></li>)}</ol></section>
      {(showMap || hasPolicies) && <section className={styles.visitGrid}>
        {showMap && <div id="service-location" className={styles.anchor}><div className={shared.sectionHeading}><h2>The local <em>connection.</em></h2></div><p className={styles.locationNote}>{service.serviceLocation === "AT_CUSTOMER" ? "Provider’s base · this service comes to your location." : service.serviceLocation === "FLEXIBLE" ? "Provider’s base · agree on your service location before visiting." : "Confirm your appointment with the provider before visiting."}</p><StoreLocationCard store={locationRecord} /></div>}
        {hasPolicies && <section className={`${shared.detailCard} ${styles.policies}`} aria-labelledby="service-policies"><div className={shared.cardHeading}><FileText size={21} aria-hidden /><h2 id="service-policies">Before we begin</h2></div>{service.returnPolicy && <><h3>Service policy</h3><p>{service.returnPolicy}</p></>}{store.policies && <><h3>Provider policies</h3><p>{store.policies}</p></>}</section>}
      </section>}
      <section className={`${shared.detailCard} ${shared.reviewSection}`} id="service-reviews" aria-label="Service reviews">{reviews}</section>
      {linkedContent && <section className={shared.recommendations}>{linkedContent}</section>}
      {recommendations.length > 0 && <section className={shared.recommendations}><div className={shared.sectionHeading}><div><p className={shared.eyebrow}>MORE LOCAL TALENT</p><h2>Find your next <em>good thing.</em></h2></div><Link href="/services">Explore services<ArrowUpRight size={19} aria-hidden /></Link></div><div className={styles.recommendations}>{recommendations.map(item => <article key={item.id} className={styles.recommendation}><Link href={preview ? `https://www.linkweonlinemall.com/service/${item.slug}` : `/service/${item.slug}`} className={styles.recommendationImage}><StorefrontImage src={item.images[0]} alt={item.name} /><span>{serviceTypeInfo(item.serviceType).label}</span><span aria-hidden><ArrowUpRight size={19} /></span></Link><div className={styles.recommendationBody}><Link className={styles.recommendationStore} href={preview ? `https://www.linkweonlinemall.com/store/${item.store.slug}` : `/store/${item.store.slug}`}><div><StorefrontImage src={item.store.logoUrl} alt="" /></div><span>{item.store.name}</span><ArrowUpRight size={13} aria-hidden /></Link><Link href={preview ? `https://www.linkweonlinemall.com/service/${item.slug}` : `/service/${item.slug}`}><h3>{item.name}</h3></Link><div className={styles.recommendationBottom}><strong>{servicePrice(item).label}</strong>{item.store.region && <span><MapPin size={12} aria-hidden />{getRegionLabel(item.store.region)}</span>}</div></div></article>)}</div></section>}
      <footer className={shared.productFooter}><Link href={storeHref}><ArrowLeft size={16} aria-hidden />Back to {store.name}</Link><Link href="/services">Explore LinkWe services<ArrowUpRight size={16} aria-hidden /></Link></footer>
    </main>
    {!isOwner && <div className={shared.mobilePurchase}><div><small>{info.label}</small><strong>{price.label}</strong></div><a href="#service-booking">{info.action}<ArrowUpRight size={16} aria-hidden /></a></div>}
  </div>;
}
