import type { ContentLinkItem } from "@/lib/content-links/types";
import { typography } from "@/lib/design-system";

import RelatedContentCards from "./RelatedContentCards";

type Props = {
  heading: string;
  items: ContentLinkItem[];
};

export default function RelatedContentSection({ heading, items }: Props) {
  if (items.length === 0) return null;

  const cardItems = items.map((item) => ({
    id: item.linkId,
    name: item.name,
    image: item.image,
    price: item.price,
    href: item.href,
  }));

  return (
    <section
      id="shop-this-event"
      className="mt-10 scroll-mt-24 border-t border-zinc-200 pt-10 lg:scroll-mt-10"
    >
      <h2 className={`${typography.h4} mb-4 text-zinc-900 sm:mb-6`}>{heading}</h2>
      <RelatedContentCards items={cardItems} />
    </section>
  );
}
