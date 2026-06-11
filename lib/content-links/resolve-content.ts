import { prisma } from "@/lib/prisma";
import { CONTENT_LINK_TYPES } from "@/lib/content-links/types";
import type { ContentLinkType } from "@/lib/content-links/types";

export type ResolvedRow = {
  type: ContentLinkType;
  id: string;
  name: string;
  slug: string;
  image: string | null;
  priceTtd: number | null;
  storeId: string;
  isPublic: boolean;
};

export function isContentLinkType(value: string): value is ContentLinkType {
  return (CONTENT_LINK_TYPES as readonly string[]).includes(value);
}

export async function resolveContentRows(
  type: ContentLinkType,
  ids: string[],
  options: { publicOnly: boolean },
): Promise<Map<string, ResolvedRow>> {
  const map = new Map<string, ResolvedRow>();
  if (ids.length === 0) return map;

  if (type === "PRODUCT" || type === "SERVICE") {
    const rows = await prisma.product.findMany({
      where: {
        id: { in: ids },
        isService: type === "SERVICE",
        ...(options.publicOnly
          ? { isPublished: true, isArchived: false }
          : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        storeId: true,
        isPublished: true,
        isArchived: true,
      },
    });

    for (const row of rows) {
      const isPublic = row.isPublished && !row.isArchived;
      if (options.publicOnly && !isPublic) continue;
      map.set(row.id, {
        type,
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.images[0] ?? null,
        priceTtd: row.price,
        storeId: row.storeId,
        isPublic,
      });
    }
    return map;
  }

  const rows = await prisma.event.findMany({
    where: {
      id: { in: ids },
      ...(options.publicOnly ? { status: "PUBLISHED" } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      storeId: true,
      status: true,
    },
  });

  for (const row of rows) {
    const isPublic = row.status === "PUBLISHED";
    if (options.publicOnly && !isPublic) continue;
    map.set(row.id, {
      type: "EVENT",
      id: row.id,
      name: row.title,
      slug: row.slug,
      image: row.coverImage,
      priceTtd: null,
      storeId: row.storeId,
      isPublic,
    });
  }

  return map;
}

export function hrefForType(type: ContentLinkType, slug: string): string {
  switch (type) {
    case "PRODUCT":
      return `/products/${slug}`;
    case "SERVICE":
      return `/service/${slug}`;
    case "EVENT":
      return `/events/${slug}`;
  }
}
