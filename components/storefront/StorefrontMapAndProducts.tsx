"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type StorefrontProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  category: string | null;
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  /** Shown in map footer when address is empty (e.g. store region). */
  region?: string | null;
  products: StorefrontProductRow[];
};

function StoreMapBox({
  latitude,
  longitude,
  mapboxAccessToken,
}: {
  latitude: number;
  longitude: number;
  mapboxAccessToken: string;
}) {
  const [modules, setModules] = useState<{
    Map: typeof import("react-map-gl/mapbox").default;
    Marker: typeof import("react-map-gl/mapbox").Marker;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // @ts-expect-error Mapbox CSS has no bundled TypeScript module declaration
    void import("mapbox-gl/dist/mapbox-gl.css");
    void import("react-map-gl/mapbox").then((mod) => {
      if (!cancelled) {
        setModules({ Map: mod.default, Marker: mod.Marker });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { Map: MapComponent, Marker } = modules ?? {};

  return (
    <div className="h-[280px] w-full overflow-hidden">
      {!MapComponent || !Marker ? (
        <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800" aria-hidden />
      ) : (
        <MapComponent
          mapboxAccessToken={mapboxAccessToken}
          scrollZoom={true}
          doubleClickZoom={true}
          touchZoomRotate={true}
          dragPan={false}
          initialViewState={{
            longitude,
            latitude,
            zoom: 14,
          }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          style={{ width: "100%", height: "100%" }}
        >
          <Marker longitude={longitude} latitude={latitude} anchor="center">
            <div className="h-4 w-4 rounded-full border-2 border-white bg-[#D4450A] shadow-md" />
          </Marker>
        </MapComponent>
      )}
    </div>
  );
}

export function StorefrontMapAndProducts({ latitude, longitude, address, region, products }: Props) {
  const mapToken = typeof process.env.NEXT_PUBLIC_MAPBOX_TOKEN === "string"
    ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN.trim()
    : "";
  const showMap =
    latitude !== null && longitude !== null && mapToken.length > 0;

  const [search, setSearch] = useState("");
  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const p of products) {
      const c = p.category?.trim();
      if (c) unique.add(c);
    }
    return ["All", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const [category, setCategory] = useState("All");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const nameOk = q === "" || p.name.toLowerCase().includes(q);
      const catOk =
        category === "All" ||
        (p.category?.trim() ?? "") === category;
      return nameOk && catOk;
    });
  }, [products, search, category]);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {showMap ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 p-4">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-zinc-900 dark:text-zinc-50"
                aria-hidden
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Find us</span>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Get directions
            </a>
          </div>
          <StoreMapBox
            latitude={latitude as number}
            longitude={longitude as number}
            mapboxAccessToken={mapToken}
          />
          <div className="p-4">
            {address?.trim() ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{address.trim()}</p>
            ) : region?.trim() ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Region</p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{region.trim()}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">Products</p>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="sr-only">Search products</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-[#D4450A]/30 placeholder:text-zinc-400 focus:border-[#D4450A] focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    category === c
                      ? "bg-[#D4450A] text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No products found</p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                  const img = product.images[0];
                  return (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                      >
                        <div className="aspect-square w-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                          {img ? (
                            <img
                              alt=""
                              className="h-full w-full object-cover transition group-hover:opacity-95"
                              src={img}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {product.name}
                          </p>
                          <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            TTD {product.price.toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
