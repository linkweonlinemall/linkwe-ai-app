import Link from "next/link";

import type { ContentLinkItem } from "@/lib/content-links/types";
import { minorToTtd } from "@/lib/finance/commission";
import { radius, shadow, typography, tw } from "@/lib/design-system";

type Props = {
  heading: string;
  items: ContentLinkItem[];
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

export default function RelatedContentSection({ heading, items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-zinc-200 pt-10">
      <h2 className={`${typography.h4} mb-6 text-zinc-900`}>{heading}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.linkId}
            href={item.href}
            prefetch
            className={`group overflow-hidden ${radius.card} bg-white ${shadow.card} transition-all hover:shadow-md`}
          >
            <div className="aspect-square overflow-hidden bg-zinc-100">
              <CardImage image={item.image} name={item.name} />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-zinc-900">{item.name}</p>
              {item.price != null ? (
                <p className={`mt-1 text-sm font-bold ${tw.textScarlet}`}>
                  TTD {minorToTtd(item.price).toFixed(2)}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
