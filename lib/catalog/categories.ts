import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES, STORE_CATEGORIES } from "@/lib/categories";
import { EVENT_CATEGORY_GROUPS } from "@/lib/events/categories";

export type CatalogueKind = "products" | "services" | "stores" | "events" | "tickets";
export const CATALOGUE_KINDS: {value: CatalogueKind; label: string; href: string}[] = [
  {value:"products",label:"Products",href:"/shop"}, {value:"services",label:"Services",href:"/services"},
  {value:"stores",label:"Stores",href:"/stores"}, {value:"events",label:"Events",href:"/events"},
  {value:"tickets",label:"Tickets",href:"/events?availability=on_sale"},
];
export const STORE_CATEGORY_ALIASES: Record<string,string> = {
  fashion_clothing:"fashion_apparel", beauty_cosmetics:"beauty_wellness",
  home_living:"home_furniture", electronics:"electronics_tech", food_groceries:"grocery_supermarket",
  toys_games:"toys_kids", hotel_accommodation:"hospitality_hotel", hotel_guesthouse:"hospitality_hotel",
  barbershop_salon:"salon_barbershop", fitness_wellness:"sports_fitness", photography_media:"photography_studio",
  events_parties:"events_planning", vehicle_sales_rentals:"vehicles",
  farm_agriculture:"agriculture_farming",
};
export const canonicalStoreCategory = (value:string) => Object.prototype.hasOwnProperty.call(STORE_CATEGORY_ALIASES,value) ? STORE_CATEGORY_ALIASES[value] : value;
export function storeCategoryValues(value:string) { const canonical=canonicalStoreCategory(value);return [canonical,...Object.keys(STORE_CATEGORY_ALIASES).filter(key=>STORE_CATEGORY_ALIASES[key]===canonical)]; }
export function catalogueCategories(kind:CatalogueKind): {value:string;label:string}[] {
  const source=kind==="products"?PRODUCT_CATEGORIES:kind==="services"?SERVICE_CATEGORIES:kind==="stores"?STORE_CATEGORIES:EVENT_CATEGORY_GROUPS.flatMap(group=>group.options);
  return source.filter(option=>kind!=="stores"||canonicalStoreCategory(option.value)===option.value).map(option=>({...option})).sort((a,b)=>a.label.localeCompare(b.label));
}
export function catalogueCategoryLabel(kind:CatalogueKind,value:string) { return catalogueCategories(kind).find(option=>option.value===(kind==="stores"?canonicalStoreCategory(value):value))?.label??value.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase()); }
export function categoryHref(kind:CatalogueKind,value:string) { const base=CATALOGUE_KINDS.find(item=>item.value===kind)!;return `${base.href}${base.href.includes("?")?"&":"?"}category=${encodeURIComponent(value)}`; }

export function categoryFacets(kind: CatalogueKind, counts: Map<string, number>) {
  const known = catalogueCategories(kind);
  const knownValues = new Set(known.map(c => c.value));
  return [...known.map(c => ({...c,count:counts.get(c.value) ?? 0})), ...[...counts].filter(([value]) => !knownValues.has(value)).map(([value,count]) => ({value,label:catalogueCategoryLabel(kind,value),count}))].sort((a,b) => b.count-a.count || a.label.localeCompare(b.label));
}
