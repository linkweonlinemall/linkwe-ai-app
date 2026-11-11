/** Pure storefront filtering. Every product predicate is evaluated on the same variant. */
export type CatalogueItem = {
  id: string; name: string; slug: string; price: number; images: string[]; category: string | null;
  isFeatured?: boolean; isService?: boolean; createdAt?: Date | string; compareAtPrice?: number | null;
  stock?: number | null; hasVariants?: boolean;
  variants?: { attributes: unknown; stock?: number | null; price?: number | null }[];
  serviceType?: string | null; serviceLocation?: string | null; serviceDuration?: number | null; durationMinutes?: number | null;
  quotePriceType?: string | null; subscriptionInterval?: string | null; isAvailable?: boolean;
};
export const filterDefaults = { q: '', type: '', category: '', min: '', max: '', sale: '', available: '', sort: '', colour: '', size: '', serviceType: '', location: '', pricing: '' };
export type CatalogueFilters = typeof filterDefaults;
export type FilterKey = keyof CatalogueFilters;
export const sortLabels: Record<string, string> = { '': 'Recommended', newest: 'Newest first', price_asc: 'Price: low to high', price_desc: 'Price: high to low', name: 'Name: A to Z', name_desc: 'Name: Z to A', stock: 'Most in stock', duration: 'Shortest session' };
export const pricingLabels: Record<string, string> = { fixed: 'Fixed price', starting: 'Starting price', callout: 'Call-out fee', quote: 'Quote on request', subscription: 'Recurring subscription' };
const enums: Partial<Record<FilterKey, string[]>> = { type: ['products', 'services'], sale: ['1'], available: ['1'], sort: Object.keys(sortLabels), pricing: Object.keys(pricingLabels), serviceType: ['BOOKABLE','QUOTE','ON_DEMAND','SUBSCRIPTION','VIRTUAL'], location: ['AT_VENDOR','AT_CUSTOMER','FLEXIBLE','VIRTUAL'] };
export function readCatalogueFilters(params: { get(key: string): string | null }, prefix: string): CatalogueFilters {
  const result = { ...filterDefaults };
  for (const key of Object.keys(result) as FilterKey[]) {
    const value = (params.get(`${prefix}${key}`) ?? '').slice(0, key === 'q' ? 120 : 100);
    if (key === 'min' || key === 'max') {
      result[key] = /^\d{1,8}(\.\d{0,2})?$/.test(value) && Number(value) <= 99999999 ? value : '';
    } else result[key] = enums[key] && !enums[key]!.includes(value) ? '' : value;
  }
  return result;
}
export function pricingKind(item: CatalogueItem) {
  if (!item.isService) return 'fixed';
  if (item.serviceType === 'SUBSCRIPTION') return 'subscription';
  if (item.serviceType === 'QUOTE') return item.quotePriceType === 'STARTING_FROM' ? 'starting' : item.quotePriceType === 'CALLOUT_FEE' ? 'callout' : 'quote';
  return 'fixed';
}
export function itemLocation(item: CatalogueItem) { return item.serviceType === 'VIRTUAL' ? 'VIRTUAL' : item.serviceLocation ?? ''; }
export function serviceDisplayDuration(item: CatalogueItem) { return item.serviceType === 'BOOKABLE' || item.serviceType === 'VIRTUAL' ? item.durationMinutes ?? item.serviceDuration : item.serviceDuration; }
export function productChoices(item: CatalogueItem) {
  return item.hasVariants ? (item.variants ?? []).map(v => ({ ...v, price: v.price ?? item.price })) : [{ price: item.price, stock: item.stock, attributes: [] }];
}
function optionMatches(attributes: unknown, name: string, value: string) {
  return !value || Array.isArray(attributes) && attributes.some(a => a && typeof a.name === 'string' && typeof a.value === 'string' && (a.name.trim().toLowerCase() === name || name === 'colour' && a.name.trim().toLowerCase() === 'color') && a.value.trim().toLowerCase() === value.trim().toLowerCase());
}
export function itemAvailable(item: CatalogueItem, availableNow?: boolean) {
  return item.isService ? item.isAvailable !== false && (item.serviceType !== 'ON_DEMAND' || availableNow !== false) : (item.stock == null || item.stock > 0) && productChoices(item).some(v => v.stock == null || v.stock > 0);
}
export function salePrice(item: CatalogueItem, price: number) { return pricingKind(item) === 'fixed' && Number.isFinite(price) && price >= 0 && item.compareAtPrice != null && Number.isFinite(item.compareAtPrice) && item.compareAtPrice > price; }
export function effectivePrice(item: CatalogueItem) {
  const choices = productChoices(item);
  return item.isService || !choices.length ? item.price : Math.min(...choices.map(v => v.price));
}
export function filterCatalogue(items: CatalogueItem[], f: CatalogueFilters, availableNow?: boolean) {
  const inRange = (price: number) => (!f.min || price >= Number(f.min)) && (!f.max || price <= Number(f.max));
  const results = items.flatMap(item => {
    if (f.type && (f.type === 'services') !== !!item.isService) return [];
    if (f.q && !`${item.name} ${item.category ?? ''}`.toLowerCase().includes(f.q.trim().toLowerCase())) return [];
    if (f.category && item.category !== f.category) return [];
    if (f.pricing && pricingKind(item) !== f.pricing) return [];
    if (f.serviceType && (!item.isService || item.serviceType !== f.serviceType)) return [];
    if (f.location && (!item.isService || itemLocation(item) !== f.location)) return [];
    if (item.isService) {
      if (f.colour || f.size || f.available && !itemAvailable(item, availableNow)) return [];
      // Mixed pricing is not comparable: range/sort prices include fixed-price services only,
      // unless a specific pricing basis has explicitly been chosen.
      if ((f.min || f.max) && (pricingKind(item) === 'quote' || !f.pricing && pricingKind(item) !== 'fixed')) return [];
      if (!inRange(item.price) || f.sale && !salePrice(item, item.price)) return [];
      return [item];
    }
    if (f.available && item.stock != null && item.stock <= 0) return [];
    const choices = productChoices(item).filter(v => (!f.available || v.stock == null || v.stock > 0) && optionMatches(v.attributes, 'colour', f.colour) && optionMatches(v.attributes, 'size', f.size) && inRange(v.price) && (!f.sale || salePrice(item, v.price)));
    if (!choices.length) return [];
    const optionStock = choices.some(v => v.stock == null) ? Infinity : choices.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    const sharedStock = Math.min(item.stock ?? Infinity, optionStock);
    return [{ ...item, price: Math.min(...choices.map(v => v.price)), stock: item.hasVariants ? (Number.isFinite(sharedStock) ? sharedStock : null) : item.stock }];
  });
  const date = (item: CatalogueItem) => item.createdAt ? new Date(item.createdAt).getTime() || 0 : 0;
  return results.sort((a,b) => {
    if (f.sort === 'price_asc' || f.sort === 'price_desc') {
      const comparable = (i: CatalogueItem) => pricingKind(i) !== 'quote' && (f.pricing ? pricingKind(i) === f.pricing : pricingKind(i) === 'fixed');
      if (comparable(a) !== comparable(b)) return comparable(a) ? -1 : 1;
      if (comparable(a)) return f.sort === 'price_asc' ? a.price - b.price : b.price - a.price;
    }
    if (f.sort === 'name') return a.name.localeCompare(b.name);
    if (f.sort === 'name_desc') return b.name.localeCompare(a.name);
    if (f.sort === 'newest') return date(b) - date(a);
    if (f.sort === 'stock') return (b.stock ?? Number.MAX_SAFE_INTEGER) - (a.stock ?? Number.MAX_SAFE_INTEGER);
    if (f.sort === 'duration') return (serviceDisplayDuration(a) ?? Number.MAX_SAFE_INTEGER) - (serviceDisplayDuration(b) ?? Number.MAX_SAFE_INTEGER);
    return Number(!!b.isFeatured) - Number(!!a.isFeatured) || date(b) - date(a) || a.name.localeCompare(b.name);
  });
}
