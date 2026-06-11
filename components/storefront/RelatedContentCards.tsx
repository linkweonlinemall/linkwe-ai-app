import Link from "next/link";

import { minorToTtd } from "@/lib/finance/commission";
import { radius, shadow, tw } from "@/lib/design-system";

export type RelatedContentCardItem = {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  href: string;
};

function CardImage({ image, name }: { image: string | null; name: string }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#FEF0EB]">
      <span className="text-2xl font-bold text-[#D4450A]">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function RelatedContentCards({ items }: { items: RelatedContentCardItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          prefetch
          className={`group flex h-full flex-col overflow-hidden ${radius.card} bg-white ${shadow.card} transition-all hover:shadow-md`}
        >
          <div className="aspect-square shrink-0 overflow-hidden bg-zinc-100">
            <CardImage image={item.image} name={item.name} />
          </div>
          <div className="flex min-h-[4.25rem] flex-1 flex-col p-2.5 sm:min-h-0 sm:p-3">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-900 sm:truncate sm:text-sm sm:leading-normal">
              {item.name}
            </p>
            {item.price != null ? (
              <p
                className={`mt-auto pt-1 text-[13px] font-bold leading-none sm:mt-1 sm:pt-0 sm:text-sm ${tw.textScarlet}`}
              >
                TTD {minorToTtd(item.price).toFixed(2)}
              </p>
            ) : (
              <span className="mt-auto block min-h-[1.125rem] sm:hidden" aria-hidden />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
