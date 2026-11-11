import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import StorefrontTabs from '@/components/storefront/StorefrontTabs';
import styles from '@/components/storefront/storefront.module.css';

export const metadata = { title: 'Store catalogue preview', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function CataloguePreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const base = { images: [], category: 'CLOTHING', stock: 8, hasVariants: false, variants: [], isFeatured: true, createdAt: '2026-01-01' };
  const products = [
    { ...base, id: 'shirt', name: 'Island linen shirt', slug: 'fixture-shirt', price: 120, compareAtPrice: 180 },
    { ...base, id: 'tote', name: 'Market day tote', slug: 'fixture-tote', category: 'ACCESSORIES', price: 75, stock: 0 },
    { ...base, id: 'unselected', name: 'Unselected beach towel', slug: 'fixture-towel', price: 90, isFeatured: false, createdAt: '2026-11-01' },
    { ...base, id: 'variants', name: 'Colourful cotton tee', slug: 'fixture-tee', price: 100, compareAtPrice: 150, hasVariants: true, variants: [
      { attributes: [{ name: 'Colour', value: 'red' }, { name: 'Size', value: 'S' }], price: 50, stock: 0 },
      { attributes: [{ name: 'Colour', value: 'blue' }, { name: 'Size', value: 'L' }], price: 200, stock: 3 },
      { attributes: [{ name: 'Colour', value: 'red' }, { name: 'Size', value: 'M' }], price: null, stock: 2 },
    ] },
  ];
  const service = { images: [], category: 'BEAUTY', serviceDuration: 60, serviceLocation: 'AT_VENDOR', isFeatured: true, isAvailable: true, createdAt: '2026-07-01' };
  const services = [
    { ...service, id: 'styling', name: 'Personal styling session', slug: 'fixture-styling', serviceType: 'BOOKABLE', price: 250, compareAtPrice: 300 },
    { ...service, id: 'quote', name: 'Custom event consultation', slug: 'fixture-quote', serviceType: 'QUOTE', quotePriceType: 'FREE_QUOTE', price: 0, compareAtPrice: 100 },
    { ...service, id: 'callout', name: 'At-home fitting visit', slug: 'fixture-callout', serviceType: 'QUOTE', quotePriceType: 'CALLOUT_FEE', serviceLocation: 'AT_CUSTOMER', price: 80 },
    { ...service, id: 'subscription', name: 'Monthly wardrobe care', slug: 'fixture-subscription', serviceType: 'SUBSCRIPTION', subscriptionInterval: 'MONTHLY', price: 150 },
    { ...service, id: 'unavailable', name: 'Express alterations', slug: 'fixture-alterations', serviceType: 'ON_DEMAND', price: 100, isAvailable: false },
  ];
  return <div className={styles.page}><header className="bg-[#173f58] px-6 py-8 text-white"><p className="text-sm">Development preview · fictional items · shopping disabled</p><h1 className="mt-3 text-3xl font-bold">Island Finds</h1></header><Suspense fallback={<p>Loading catalogue…</p>}><StorefrontTabs preview store={{ name: 'Island Finds', slug: 'fixture-island-finds', logoUrl: null, tagline: 'Local finds, thoughtfully chosen.', categoryId: 'FASHION', region: 'PORT_OF_SPAIN', images: [], description: 'A fictional store for testing catalogue filters.', policies: null, latitude: null, longitude: null, address: null, tags: [], amenities: [], owner: { fullName: 'Preview vendor' }, isAvailableNow: false }} storeId="fixture-store" products={products} services={services} initialSaved={false} followerCount={0} openingHours={null} socialLinks={{}} hasSocialLinks={false} isLoggedIn={false} /></Suspense></div>;
}
