"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { ttdToMinor } from "@/lib/finance/commission";
import { prisma } from "@/lib/prisma";
import type {
  AttachableContentItem,
  ContentLinkItem,
  ContentLinkType,
} from "@/lib/content-links/types";
import {
  hrefForType,
  isContentLinkType,
  resolveContentRows,
  type ResolvedRow,
} from "@/lib/content-links/resolve-content";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";

const OWNERSHIP_ERROR = "You can only link your own items";
const NO_STORE_ERROR = "Store not found.";
const ATTACHABLE_LIMIT = 50;

function toLinkedItem(row: ResolvedRow, linkId: string): ContentLinkItem {
  return {
    linkId,
    type: row.type,
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image,
    price:
      row.type === "EVENT" || row.priceTtd == null ? null : ttdToMinor(row.priceTtd),
    href: hrefForType(row.type, row.slug),
  };
}

function toAttachableItem(row: ResolvedRow): AttachableContentItem {
  return {
    type: row.type,
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: row.image,
  };
}

async function contentBelongsToStore(
  type: ContentLinkType,
  id: string,
  storeId: string,
): Promise<boolean> {
  const rows = await resolveContentRows(type, [id], { publicOnly: false });
  const row = rows.get(id);
  return row?.storeId === storeId;
}

async function revalidateContentPaths(
  type: ContentLinkType,
  id: string,
): Promise<void> {
  const rows = await resolveContentRows(type, [id], { publicOnly: false });
  const row = rows.get(id);
  if (!row) return;
  try {
    revalidatePath(hrefForType(type, row.slug));
  } catch {
    // Non-fatal if revalidation context is unavailable
  }
}

async function requireOwnerStore(): Promise<
  { ok: true; storeId: string } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const store = await getStoreByOwnerId(session.userId);
  if (!store) return { ok: false, error: NO_STORE_ERROR };

  return { ok: true, storeId: store.id };
}

export async function attachContent(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isContentLinkType(fromType) || !isContentLinkType(toType)) {
    return { ok: false, error: "Invalid content type." };
  }

  const trimmedFromId = fromId?.trim();
  const trimmedToId = toId?.trim();
  if (!trimmedFromId || !trimmedToId) {
    return { ok: false, error: "Invalid content id." };
  }

  if (fromType === toType && trimmedFromId === trimmedToId) {
    return { ok: false, error: "Can't link an item to itself" };
  }

  const storeResult = await requireOwnerStore();
  if (!storeResult.ok) return storeResult;

  const { storeId } = storeResult;

  const [fromOwned, toOwned] = await Promise.all([
    contentBelongsToStore(fromType, trimmedFromId, storeId),
    contentBelongsToStore(toType, trimmedToId, storeId),
  ]);

  if (!fromOwned || !toOwned) {
    return { ok: false, error: OWNERSHIP_ERROR };
  }

  const maxSort = await prisma.contentLink.aggregate({
    where: { fromType, fromId: trimmedFromId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  try {
    await prisma.contentLink.create({
      data: {
        storeId,
        fromType,
        fromId: trimmedFromId,
        toType,
        toId: trimmedToId,
        sortOrder,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: true };
    }
    console.error("[content-links] attachContent", err);
    return { ok: false, error: "Could not attach linked item." };
  }

  await Promise.all([
    revalidateContentPaths(fromType, trimmedFromId),
    revalidateContentPaths(toType, trimmedToId),
  ]);

  return { ok: true };
}

export async function detachContent(
  linkId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedId = linkId?.trim();
  if (!trimmedId) return { ok: false, error: "Link not found." };

  const storeResult = await requireOwnerStore();
  if (!storeResult.ok) return storeResult;

  const link = await prisma.contentLink.findUnique({
    where: { id: trimmedId },
    select: {
      id: true,
      storeId: true,
      fromType: true,
      fromId: true,
      toType: true,
      toId: true,
    },
  });

  if (!link) return { ok: false, error: "Link not found." };
  if (link.storeId !== storeResult.storeId) {
    return { ok: false, error: OWNERSHIP_ERROR };
  }

  await prisma.contentLink.delete({ where: { id: link.id } });

  if (isContentLinkType(link.fromType)) {
    await revalidateContentPaths(link.fromType, link.fromId);
  }
  if (isContentLinkType(link.toType)) {
    await revalidateContentPaths(link.toType, link.toId);
  }

  return { ok: true };
}

export async function getLinkedContent(
  fromType: string,
  fromId: string,
  options?: { includeUnpublished?: boolean },
): Promise<{ items: ContentLinkItem[] }> {
  if (!isContentLinkType(fromType)) return { items: [] };

  const trimmedFromId = fromId?.trim();
  if (!trimmedFromId) return { items: [] };

  const includeUnpublished = options?.includeUnpublished === true;
  if (includeUnpublished) {
    const storeResult = await requireOwnerStore();
    if (!storeResult.ok) return { items: [] };
    const fromOwned = await contentBelongsToStore(
      fromType,
      trimmedFromId,
      storeResult.storeId,
    );
    if (!fromOwned) return { items: [] };
  }

  const links = await prisma.contentLink.findMany({
    where: { fromType, fromId: trimmedFromId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, toType: true, toId: true },
  });

  if (links.length === 0) return { items: [] };

  const idsByType: Record<ContentLinkType, string[]> = {
    PRODUCT: [],
    SERVICE: [],
    EVENT: [],
  };

  for (const link of links) {
    if (!isContentLinkType(link.toType)) continue;
    idsByType[link.toType].push(link.toId);
  }

  const publicOnly = !includeUnpublished;
  const [productRows, serviceRows, eventRows] = await Promise.all([
    resolveContentRows("PRODUCT", idsByType.PRODUCT, { publicOnly }),
    resolveContentRows("SERVICE", idsByType.SERVICE, { publicOnly }),
    resolveContentRows("EVENT", idsByType.EVENT, { publicOnly }),
  ]);

  const resolved = new Map<string, ResolvedRow>([
    ...productRows,
    ...serviceRows,
    ...eventRows,
  ]);

  const items: ContentLinkItem[] = [];
  for (const link of links) {
    if (!isContentLinkType(link.toType)) continue;
    const row = resolved.get(link.toId);
    if (!row) continue;
    if (!includeUnpublished && !row.isPublic) continue;
    items.push(toLinkedItem(row, link.id));
  }

  return { items };
}

export async function getAttachableItems(
  fromType: string,
  fromId: string,
): Promise<{ items: AttachableContentItem[] } | { ok: false; error: string }> {
  if (!isContentLinkType(fromType)) {
    return { ok: false, error: "Invalid content type." };
  }

  const trimmedFromId = fromId?.trim();
  if (!trimmedFromId) return { ok: false, error: "Invalid content id." };

  const storeResult = await requireOwnerStore();
  if (!storeResult.ok) return storeResult;

  const { storeId } = storeResult;

  const fromOwned = await contentBelongsToStore(fromType, trimmedFromId, storeId);
  if (!fromOwned) return { ok: false, error: OWNERSHIP_ERROR };

  const [existingLinks, products, services, events] = await Promise.all([
    prisma.contentLink.findMany({
      where: { fromType, fromId: trimmedFromId },
      select: { toType: true, toId: true },
    }),
    prisma.product.findMany({
      where: { storeId, isService: false, isArchived: false },
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
      orderBy: { createdAt: "desc" },
      take: ATTACHABLE_LIMIT,
    }),
    prisma.product.findMany({
      where: { storeId, isService: true, isArchived: false },
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
      orderBy: { createdAt: "desc" },
      take: ATTACHABLE_LIMIT,
    }),
    prisma.event.findMany({
      where: { storeId },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        storeId: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: ATTACHABLE_LIMIT,
    }),
  ]);

  const linkedKeys = new Set(
    existingLinks.map((l) => `${l.toType}:${l.toId}`),
  );

  function isExcluded(type: ContentLinkType, id: string): boolean {
    if (type === fromType && id === trimmedFromId) return true;
    return linkedKeys.has(`${type}:${id}`);
  }

  const items: AttachableContentItem[] = [];

  for (const row of products) {
    if (isExcluded("PRODUCT", row.id)) continue;
    items.push(
      toAttachableItem({
        type: "PRODUCT",
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.images[0] ?? null,
        priceTtd: row.price,
        storeId: row.storeId,
        isPublic: row.isPublished && !row.isArchived,
      }),
    );
  }

  for (const row of services) {
    if (isExcluded("SERVICE", row.id)) continue;
    items.push(
      toAttachableItem({
        type: "SERVICE",
        id: row.id,
        name: row.name,
        slug: row.slug,
        image: row.images[0] ?? null,
        priceTtd: row.price,
        storeId: row.storeId,
        isPublic: row.isPublished && !row.isArchived,
      }),
    );
  }

  for (const row of events) {
    if (isExcluded("EVENT", row.id)) continue;
    items.push(
      toAttachableItem({
        type: "EVENT",
        id: row.id,
        name: row.title,
        slug: row.slug,
        image: row.coverImage,
        priceTtd: null,
        storeId: row.storeId,
        isPublic: row.status === "PUBLISHED",
      }),
    );
  }

  return { items };
}
