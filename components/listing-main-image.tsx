"use client";

type Props = {
  alt: string;
  imageUrl: string | null;
  /** e.g. aspect-video, aspect-square */
  aspectClass?: string;
  /** Include rounding/size here, e.g. "rounded-lg w-24 shrink-0" */
  className?: string;
};

export function ListingMainImage({ alt, imageUrl, aspectClass = "aspect-video", className = "" }: Props) {
  const url = imageUrl?.trim() ?? "";
  if (url) {
    return (
      <div className={`overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${aspectClass} ${className}`}>
        {/* Arbitrary vendor URLs; plain img keeps local dev simple (no remotePatterns). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt} className="size-full object-cover" loading="lazy" src={url} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center border border-dashed border-zinc-300 bg-zinc-100 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 ${aspectClass} ${className}`}
    >
      No image yet
    </div>
  );
}
