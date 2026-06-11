"use server";

import type { RelationshipStatus } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { getSession } from "@/lib/auth/session";
import { ttdToMinor } from "@/lib/finance/commission";
import {
  hrefForType,
  isContentLinkType,
  resolveContentRows,
  type ResolvedRow,
} from "@/lib/content-links/resolve-content";
import type { ContentLinkType } from "@/lib/content-links/types";
import type {
  CrossStoreOutgoingRow,
  CrossStoreRequestRow,
  CrossStoreResolvedItem,
  PartnerContentItem,
} from "@/lib/cross-store/types";

export type CrossStoreFeatureButtonState = {
  canRequest: boolean;
  alreadyRequested: boolean;
};
import { prisma } from "@/lib/prisma";

const PARTNERS_URL = "/dashboard/vendor/partners";
const NO_STORE_ERROR = "Store not found.";

const STATUS_SORT: Record<RelationshipStatus, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
};

async function requireCallerStore(): Promise<
  | { ok: true; storeId: string; storeName: string }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const store = await prisma.store.findUnique({
    where: { ownerId: session.userId },
    select: { id: true, name: true },
  });
  if (!store) return { ok: false, error: NO_STORE_ERROR };

  return { ok: true, storeId: store.id, storeName: store.name };
}

function toPreviewItem(row: ResolvedRow): CrossStoreResolvedItem {
  return {
    type: row.type,
    name: row.name,
    image: row.image,
  };
}

function toPartnerItem(row: ResolvedRow): PartnerContentItem {
  return {
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

async function loadResolvedMap(
  relationships: Array<{ contentType: string; contentId: string }>,
  publicOnly: boolean,
): Promise<Map<string, ResolvedRow>> {
  const idsByType: Record<ContentLinkType, string[]> = {
    PRODUCT: [],
    SERVICE: [],
    EVENT: [],
  };

  for (const rel of relationships) {
    if (!isContentLinkType(rel.contentType)) continue;
    idsByType[rel.contentType].push(rel.contentId);
  }

  const [productRows, serviceRows, eventRows] = await Promise.all([
    resolveContentRows("PRODUCT", idsByType.PRODUCT, { publicOnly }),
    resolveContentRows("SERVICE", idsByType.SERVICE, { publicOnly }),
    resolveContentRows("EVENT", idsByType.EVENT, { publicOnly }),
  ]);

  return new Map([...productRows, ...serviceRows, ...eventRows]);
}

function sortIncomingRequests<T extends { status: RelationshipStatus; updatedAt: Date }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const statusDiff = STATUS_SORT[a.status] - STATUS_SORT[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

async function notifySafely(input: Parameters<typeof createNotification>[0]) {
  try {
    await createNotification(input);
  } catch {
    // Non-blocking
  }
}

export async function getCrossStoreFeatureButtonState(
  itemType: string,
  itemId: string,
): Promise<CrossStoreFeatureButtonState> {
  const hidden: CrossStoreFeatureButtonState = {
    canRequest: false,
    alreadyRequested: false,
  };

  if (!isContentLinkType(itemType)) return hidden;

  const trimmedId = itemId?.trim();
  if (!trimmedId) return hidden;

  const session = await getSession();
  if (!session) return hidden;

  const callerStore = await prisma.store.findUnique({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!callerStore) return hidden;

  const resolved = await resolveContentRows(
    itemType as ContentLinkType,
    [trimmedId],
    { publicOnly: true },
  );
  const item = resolved.get(trimmedId);
  if (!item) return hidden;

  if (item.storeId === callerStore.id) return hidden;

  const existing = await prisma.storeContentRelationship.findUnique({
    where: {
      requestingStoreId_targetStoreId_contentType_contentId: {
        requestingStoreId: callerStore.id,
        targetStoreId: item.storeId,
        contentType: itemType,
        contentId: trimmedId,
      },
    },
    select: { status: true },
  });

  const alreadyRequested =
    existing?.status === "PENDING" || existing?.status === "APPROVED";

  return { canRequest: true, alreadyRequested };
}

export async function requestCrossStoreFeature(
  targetContentType: string,
  targetContentId: string,
): Promise<
  | { ok: false; error: string }
  | { ok: true; alreadyRequested?: true }
> {
  if (!isContentLinkType(targetContentType)) {
    return { ok: false, error: "Invalid content type." };
  }

  const trimmedContentId = targetContentId?.trim();
  if (!trimmedContentId) {
    return { ok: false, error: "Invalid content id." };
  }

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const { storeId: requestingStoreId, storeName: requestingStoreName } = storeResult;

  const resolved = await resolveContentRows(
    targetContentType,
    [trimmedContentId],
    { publicOnly: true },
  );
  const item = resolved.get(trimmedContentId);
  if (!item) {
    return { ok: false, error: "Item not found or not published." };
  }

  if (item.storeId === requestingStoreId) {
    return { ok: false, error: "You can't feature your own item." };
  }

  const targetStore = await prisma.store.findUnique({
    where: { id: item.storeId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!targetStore) {
    return { ok: false, error: "Target store not found." };
  }

  const existing = await prisma.storeContentRelationship.findUnique({
    where: {
      requestingStoreId_targetStoreId_contentType_contentId: {
        requestingStoreId,
        targetStoreId: targetStore.id,
        contentType: targetContentType,
        contentId: trimmedContentId,
      },
    },
  });

  if (existing) {
    if (existing.status === "PENDING" || existing.status === "APPROVED") {
      return { ok: true, alreadyRequested: true };
    }

    await prisma.storeContentRelationship.update({
      where: { id: existing.id },
      data: { status: "PENDING" },
    });
  } else {
    await prisma.storeContentRelationship.create({
      data: {
        requestingStoreId,
        targetStoreId: targetStore.id,
        contentType: targetContentType,
        contentId: trimmedContentId,
        status: "PENDING",
      },
    });
  }

  await notifySafely({
    userId: targetStore.ownerId,
    type: "GENERAL",
    title: "Feature request",
    body: `${requestingStoreName} wants to feature your ${item.name} on their store.`,
    linkUrl: PARTNERS_URL,
  });

  return { ok: true };
}

export async function respondToCrossStoreRequest(
  relationshipId: string,
  decision: "APPROVED" | "REJECTED",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedId = relationshipId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid request." };

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const relationship = await prisma.storeContentRelationship.findUnique({
    where: { id: trimmedId },
    include: {
      requestingStore: { select: { id: true, name: true, ownerId: true } },
      targetStore: { select: { id: true, name: true, ownerId: true } },
    },
  });

  if (!relationship) {
    return { ok: false, error: "Request not found." };
  }

  if (relationship.targetStoreId !== storeResult.storeId) {
    return { ok: false, error: "Only the target store can respond to this request." };
  }

  if (relationship.status !== "PENDING") {
    return { ok: true };
  }

  await prisma.storeContentRelationship.update({
    where: { id: trimmedId },
    data: { status: decision },
  });

  const itemMap = await loadResolvedMap(
    [{ contentType: relationship.contentType, contentId: relationship.contentId }],
    false,
  );
  const itemName =
    itemMap.get(relationship.contentId)?.name ?? "item";

  const verb = decision === "APPROVED" ? "approved" : "declined";
  await notifySafely({
    userId: relationship.requestingStore.ownerId,
    type: "GENERAL",
    title: decision === "APPROVED" ? "Feature request approved" : "Feature request declined",
    body: `${relationship.targetStore.name} ${verb} your request to feature ${itemName}.`,
    linkUrl: PARTNERS_URL,
  });

  return { ok: true };
}

export async function getIncomingCrossStoreRequests(): Promise<
  | { ok: false; error: string }
  | { ok: true; requests: CrossStoreRequestRow[] }
> {
  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const rows = await prisma.storeContentRelationship.findMany({
    where: { targetStoreId: storeResult.storeId },
    include: {
      requestingStore: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const sorted = sortIncomingRequests(rows);
  const resolved = await loadResolvedMap(sorted, false);

  const requests: CrossStoreRequestRow[] = sorted.map((row) => {
    const itemRow = isContentLinkType(row.contentType)
      ? resolved.get(row.contentId)
      : undefined;
    return {
      relationshipId: row.id,
      requestingStoreName: row.requestingStore.name,
      item: itemRow ? toPreviewItem(itemRow) : null,
      status: row.status,
      createdAt: row.createdAt,
    };
  });

  return { ok: true, requests };
}

export async function getOutgoingCrossStoreRequests(): Promise<
  | { ok: false; error: string }
  | { ok: true; requests: CrossStoreOutgoingRow[] }
> {
  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const rows = await prisma.storeContentRelationship.findMany({
    where: { requestingStoreId: storeResult.storeId },
    include: {
      targetStore: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const resolved = await loadResolvedMap(rows, false);

  const requests: CrossStoreOutgoingRow[] = rows.map((row) => {
    const itemRow = isContentLinkType(row.contentType)
      ? resolved.get(row.contentId)
      : undefined;
    return {
      relationshipId: row.id,
      targetStoreName: row.targetStore.name,
      item: itemRow ? toPreviewItem(itemRow) : null,
      status: row.status,
      createdAt: row.createdAt,
    };
  });

  return { ok: true, requests };
}

export async function removeCrossStoreFeature(
  relationshipId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedId = relationshipId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid request." };

  const storeResult = await requireCallerStore();
  if (!storeResult.ok) return storeResult;

  const relationship = await prisma.storeContentRelationship.findUnique({
    where: { id: trimmedId },
    select: {
      requestingStoreId: true,
      targetStoreId: true,
    },
  });

  if (!relationship) {
    return { ok: false, error: "Request not found." };
  }

  const isParty =
    relationship.requestingStoreId === storeResult.storeId ||
    relationship.targetStoreId === storeResult.storeId;

  if (!isParty) {
    return { ok: false, error: "You are not authorized to remove this feature." };
  }

  await prisma.storeContentRelationship.delete({
    where: { id: trimmedId },
  });

  return { ok: true };
}

export async function getApprovedPartnerContent(
  storeId: string,
): Promise<{ items: PartnerContentItem[] }> {
  const trimmedStoreId = storeId?.trim();
  if (!trimmedStoreId) return { items: [] };

  const relationships = await prisma.storeContentRelationship.findMany({
    where: {
      requestingStoreId: trimmedStoreId,
      status: "APPROVED",
    },
    orderBy: { createdAt: "asc" },
    select: {
      contentType: true,
      contentId: true,
    },
  });

  if (relationships.length === 0) return { items: [] };

  const resolved = await loadResolvedMap(relationships, true);

  const items: PartnerContentItem[] = [];
  for (const rel of relationships) {
    if (!isContentLinkType(rel.contentType)) continue;
    const row = resolved.get(rel.contentId);
    if (!row || !row.isPublic) continue;
    items.push(toPartnerItem(row));
  }

  return { items };
}
