import Image from "next/image";
import { IconMapPin } from "@tabler/icons-react";

import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getStoreCategoryLabel } from "@/lib/categories";

import StoreHeroActions from "./StoreHeroActions";

const SCARLET = "#D4450A";

type Props = {
  store: {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    logoUrl: string | null;
    coverPhotoUrl: string | null;
    categoryId: string;
    region: string;
  };
  initials: string;
  canEditStore: boolean;
  initialFollowing: boolean;
  averageRating: number;
  reviewCount: number;
};

export default function StorePageHero({
  store,
  initials,
  canEditStore,
  initialFollowing,
  averageRating,
  reviewCount,
}: Props) {
  const ratingChip =
    reviewCount > 0 ? `★ ${averageRating.toFixed(1)} (${reviewCount})` : null;

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[220px] w-full md:h-[375px]">
        {store.coverPhotoUrl ? (
          <Image
            src={store.coverPhotoUrl}
            alt={`${store.name} cover`}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[#1C1C1A]" />
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.72) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 py-5 max-md:pb-4 md:flex-row md:items-end md:justify-between md:gap-4 md:px-7">
          <div className="flex min-w-0 flex-1 items-end gap-3 md:gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] border-[3px] border-white/90 md:h-[68px] md:w-[68px]">
              {store.logoUrl ? (
                <Image
                  src={store.logoUrl}
                  alt={store.name}
                  fill
                  className="object-cover"
                  sizes="68px"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-base font-bold text-white md:text-lg"
                  style={{ backgroundColor: SCARLET }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0 pb-0.5">
              <h1 className="truncate text-lg font-medium text-white md:text-[22px]">
                {store.name}
              </h1>
              {store.tagline ? (
                <p className="mt-[3px] line-clamp-2 text-xs text-white/[0.65] md:text-xs">
                  {store.tagline}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
                {store.region ? (
                  <span className="inline-flex items-center gap-1">
                    <IconMapPin className="size-3.5 shrink-0" stroke={1.75} aria-hidden />
                    {getRegionLabel(store.region)}
                  </span>
                ) : null}
                {store.region && store.categoryId ? (
                  <span className="text-white/40" aria-hidden>
                    ·
                  </span>
                ) : null}
                {store.categoryId ? (
                  <span>{getStoreCategoryLabel(store.categoryId)}</span>
                ) : null}
                {ratingChip ? (
                  <>
                    <span className="text-white/40" aria-hidden>
                      ·
                    </span>
                    <span
                      className="inline-flex items-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-medium text-white backdrop-blur-[8px]"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                    >
                      {ratingChip}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <StoreHeroActions
            storeId={store.id}
            storeName={store.name}
            canEditStore={canEditStore}
            initialFollowing={initialFollowing}
          />
        </div>
      </div>
    </section>
  );
}
