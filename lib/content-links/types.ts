export const CONTENT_LINK_TYPES = ["PRODUCT", "SERVICE", "EVENT"] as const;
export type ContentLinkType = (typeof CONTENT_LINK_TYPES)[number];

export type ContentLinkItem = {
  linkId: string;
  type: ContentLinkType;
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number | null;
  href: string;
};

export type AttachableContentItem = {
  type: ContentLinkType;
  id: string;
  name: string;
  slug: string;
  image: string | null;
};
