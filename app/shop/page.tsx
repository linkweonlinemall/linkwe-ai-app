import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, ArrowUpRight, Grid2X2, PackageSearch, Search, X } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import ProductSearchBar from "@/components/shop/ProductSearchBar";
import ShopHero from "@/components/shop/ShopHero";
import ShopBrowser from "@/components/shop/ShopBrowser";
import ShopProductCard from "@/components/shop/ShopProductCard";
import { getShopCatalog } from "@/lib/shop/catalog";
import { categoryLabel, parseShopQuery, SHOP_PAGE_SIZE, shopHref, type ShopParams } from "@/lib/shop/query";
import { getWishlistProductIds } from "@/app/actions/wishlist";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { prisma } from "@/lib/prisma";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import styles from "@/components/shop/shop.module.css";

export const metadata: Metadata = { title: "Shop", description: "Find your something. Shop fashion, self-care, gifts and more from local stores across Trinidad & Tobago on LinkWe." };
export default async function ShopPage({ searchParams }: { searchParams: Promise<ShopParams> }) {
  const params = await searchParams;
  const query = parseShopQuery(params);
  const [session, unreadCount, catalog, wishlistIds] = await Promise.all([getSession(), getNavUnreadCount(), getShopCatalog(query), getWishlistProductIds()]);
  const user = session ? await prisma.user.findUnique({ where: { id:session.userId }, select:{ fullName:true,role:true } }) : null;
  const dashboard = user ? getRoleDashboardPath(user.role) : undefined;
  const label = catalog.options.categories.find(c => c.value === query.category)?.label ?? PRODUCT_CATEGORIES.find(c => c.value === query.category)?.label ?? categoryLabel(query.category);
  const chips = [
    ...(query.q ? [{ key:"q", label:`Search: ${query.q}` }] : []), ...(query.category ? [{key:"category",label}] : []),
    ...(query.region ? [{key:"region",label:getRegionLabel(query.region)}] : []), ...(query.minPrice !== undefined ? [{key:"minPrice",label:`From TTD ${query.minPrice}`}] : []), ...(query.maxPrice !== undefined ? [{key:"maxPrice",label:`Up to TTD ${query.maxPrice}`}] : []),
    ...(query.inStock ? [{key:"inStock",label:"In stock"}] : []), ...["condition","brand","colour","size"].flatMap(key => { const value=query[key as "condition"|"brand"|"colour"|"size"]; return value ? [{key,label:key === "condition" ? categoryLabel(value.toLowerCase()) : `${categoryLabel(key)}: ${value}`}] : []; }),
  ];
  return <div className={styles.page}>
    <PublicNav user={user ? {name:user.fullName ?? "Account",href:dashboard!} : null} dashboardHref={dashboard} unreadCount={unreadCount} />
    {catalog.preview && <div className={styles.previewNote}>Local design preview · Real LinkWe product examples · Product links open the live store</div>}
    <main>
      <div className={styles.container}><ShopHero products={catalog.highlights} /></div>
      <section id="shop-results" className={`${styles.container} ${styles.catalog}`} aria-labelledby="results-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>SMALL STORES. BIG POSSIBILITIES.</p><h2 id="results-title">{query.q ? <>Your search. <em>Your finds.</em></> : query.category ? label : <>The good stuff is <em>right here.</em></>}</h2></div><div className={styles.searchArea}><Search size={20} aria-hidden /><ProductSearchBar key={query.q} defaultValue={query.q} category={query.category} previewMode={catalog.preview} /></div></div>
        <nav className={styles.categoryStrip} aria-label="Shop product categories"><Link href={shopHref(params,{category:undefined,page:undefined})} aria-current={!query.category ? "page" : undefined}><Grid2X2 size={15} aria-hidden />All finds</Link>{catalog.options.categories.map(c => <Link key={c.value} href={shopHref(params,{category:c.value,page:undefined})} aria-current={query.category === c.value ? "page" : undefined}>{c.label}<span>{c.count}</span></Link>)}</nav>
        {chips.length > 0 && <div className={styles.activeFilters} aria-label="Active filters">{chips.map(chip => <Link key={chip.key} href={shopHref(params,{[chip.key]:undefined,page:undefined})} aria-label={`Remove ${chip.label} filter`}>{chip.label}<X size={13} aria-hidden /></Link>)}<Link href="/shop#shop-results" className={styles.clearFilters}>Clear all</Link></div>}
        <ShopBrowser key={JSON.stringify(query)} query={query} options={catalog.options} total={catalog.total}>
          {catalog.products.length > 0 ? <div className={styles.productGrid}>{catalog.products.map(product => <ShopProductCard key={product.id} product={product} saved={wishlistIds.includes(product.id)} />)}</div> : <div className={styles.empty}><PackageSearch size={46} strokeWidth={1.3} aria-hidden /><h3>No finds just yet.</h3><p>Try another word or loosen your filters.<br />Your next favourite could be one click away.</p><Link href="/shop#shop-results">Explore all products <ArrowUpRight size={17} aria-hidden /></Link></div>}
          {catalog.total > 0 && <div className={styles.pagination}><p>Showing {(catalog.page-1)*SHOP_PAGE_SIZE+1}–{Math.min(catalog.page*SHOP_PAGE_SIZE,catalog.total)} of {catalog.total} finds</p>{catalog.pages > 1 && <nav aria-label="Product pages">{catalog.page > 1 && <Link href={shopHref(params,{page:String(catalog.page-1)})} aria-label="Previous page"><ArrowLeft size={18} /></Link>}<span>Page {catalog.page} of {catalog.pages}</span>{catalog.page < catalog.pages && <Link href={shopHref(params,{page:String(catalog.page+1)})} aria-label="Next page"><ArrowRight size={18} /></Link>}</nav>}</div>}
        </ShopBrowser>
      </section>
      <section className={`${styles.container} ${styles.bottomBanner}`}><div><p className={styles.eyebrow}>GOOD PEOPLE. GREAT AT WHAT THEY DO.</p><h2>Looking for a little <em>local know-how?</em></h2><p>Find the people who can bring your next idea to life.</p></div><Link href="/services">Explore local services <ArrowUpRight size={20} aria-hidden /></Link></section>
    </main>
  </div>;
}
