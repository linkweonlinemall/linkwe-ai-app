import type { RelationshipStatus } from "@prisma/client";

import type { ContentLinkType } from "@/lib/content-links/types";

export type CrossStoreResolvedItem = {
  type: ContentLinkType;
  name: string;
  image: string | null;
};

export type CrossStoreRequestRow = {
  relationshipId: string;
  requestingStoreName: string;
  item: CrossStoreResolvedItem | null;
  status: RelationshipStatus;
  createdAt: Date;
};

export type CrossStoreOutgoingRow = {
  relationshipId: string;
  targetStoreName: string;
  item: CrossStoreResolvedItem | null;
  status: RelationshipStatus;
  createdAt: Date;
};

export type PartnerContentItem = {
  type: ContentLinkType;
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  href: string;
};
