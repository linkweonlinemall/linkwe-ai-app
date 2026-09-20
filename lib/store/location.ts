import { getRegionLabel } from "@/lib/regions/tt-regions";

export type StoreLocation = {
  name: string;
  region: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Prefer the store's saved pin; never route visitors to an invented city-centre pin. */
export function getStoreLocation(store: StoreLocation) {
  const { latitude, longitude } = store;
  const hasCoordinates = typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  const region = getRegionLabel(store.region);
  const address = store.address?.trim() || [region, "Trinidad & Tobago"].filter(Boolean).join(", ");
  const destination = hasCoordinates ? `${latitude},${longitude}` : `${store.name}, ${address}`;
  return {
    region, address, hasCoordinates,
    directionsHref: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    mapHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
  };
}
