"use server";

import { revalidatePath } from "next/cache";
import { getApprovedPartnerContent } from "@/app/actions/cross-store";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploads/upload";
import { Prisma } from "@prisma/client";
import { createNotification } from "@/lib/notifications/create";

export type TimelineAttachment = {
  key: string;
  kind: "PRODUCT" | "SERVICE" | "COLLAB_PRODUCT" | "COLLAB_SERVICE" | "COLLAB_EVENT" | "STORE" | "EVENT" | "TICKET";
  name: string;
  subtitle: string;
  href: string;
  image: string | null;
};

const paths = (storeSlug?: string, postId?: string) => {
  revalidatePath("/timeline");
  revalidatePath("/dashboard/vendor/timeline");
  revalidatePath("/store/[slug]", "page");
  if (storeSlug) revalidatePath(`/store/${storeSlug}`);
  if (postId) revalidatePath(`/timeline/${postId}`);
};

async function getVendorAttachmentOptions(storeId: string): Promise<TimelineAttachment[]> {
  const [products, events, tickets, otherStores, partnerResult] = await Promise.all([
    prisma.product.findMany({
      where: { storeId, isPublished: true },
      select: { id: true, name: true, slug: true, images: true, isService: true, price: true },
      orderBy: { createdAt: "desc" }, take: 80,
    }),
    prisma.event.findMany({
      where: { storeId, isPublished: true },
      select: { id: true, title: true, slug: true, coverImage: true, startDate: true },
      orderBy: { startDate: "desc" }, take: 40,
    }),
    prisma.eventTicketType.findMany({
      where: { event: { storeId, isPublished: true }, isVisible: true },
      select: { id: true, name: true, price: true, event: { select: { title: true, slug: true, coverImage: true } } },
      orderBy: { createdAt: "desc" }, take: 60,
    }),
    prisma.store.findMany({
      where: { id: { not: storeId }, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, logoUrl: true, categoryId: true },
      orderBy: { name: "asc" }, take: 80,
    }),
    getApprovedPartnerContent(storeId),
  ]);

  return [
    ...products.map((item): TimelineAttachment => ({
      key: `${item.isService ? "SERVICE" : "PRODUCT"}:${item.id}`,
      kind: item.isService ? "SERVICE" : "PRODUCT",
      name: item.name,
      subtitle: `${item.isService ? "Service" : "Product"} · TTD ${item.price.toFixed(2)}`,
      href: item.isService ? `/service/${item.slug}` : `/products/${item.slug}`,
      image: item.images[0] ?? null,
    })),
    ...partnerResult.items.map((item): TimelineAttachment => ({
      key: `COLLAB_${item.type}:${item.id}`,
      kind: `COLLAB_${item.type}` as TimelineAttachment["kind"],
      name: item.name,
      subtitle: `Collab ${item.type.toLowerCase()}`,
      href: item.href,
      image: item.image,
    })),
    ...otherStores.map((item): TimelineAttachment => ({
      key: `STORE:${item.id}`, kind: "STORE", name: item.name,
      subtitle: item.categoryId.replaceAll("_", " "), href: `/store/${item.slug}`, image: item.logoUrl,
    })),
    ...events.map((item): TimelineAttachment => ({
      key: `EVENT:${item.id}`, kind: "EVENT", name: item.title,
      subtitle: `Event · ${item.startDate.toLocaleDateString("en-TT", { month: "short", day: "numeric", year: "numeric" })}`,
      href: `/events/${item.slug}`, image: item.coverImage,
    })),
    ...tickets.map((item): TimelineAttachment => ({
      key: `TICKET:${item.id}`, kind: "TICKET", name: item.name,
      subtitle: `${item.event.title} · TTD ${item.price.toFixed(2)}`,
      href: `/events/${item.event.slug}`, image: item.event.coverImage,
    })),
  ];
}

const postInclude = (userId?: string) => ({
  store: { select: { id: true, name: true, slug: true, logoUrl: true, ownerId: true } },
  likes: { where: { userId: userId ?? "" }, select: { userId: true } },
  comments: {
    where: { parentId: null }, orderBy: { createdAt: "asc" as const }, take: 20,
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      replies: { orderBy: { createdAt: "asc" as const }, include: { user: { select: { id: true, fullName: true, role: true } } } },
    },
  },
  _count: { select: { likes: true, comments: true } },
});

export type TimelineSearchOptions = { query?: string; type?: string; photos?: boolean; scope?: "following" | "all" };

const timelinePlanWhere: Prisma.StoreWhereInput = { subscriptionPlan: { in: ["GROWTH", "PRO"] }, subscriptionStatus: "ACTIVE" };

function normalizeSearchTags(values: string[]) {
  return [...new Set(values.flatMap((value) => value.split(",")).map((value) =>
    value.trim().replace(/^#+/, "").replace(/\s+/g, " ").toLowerCase().slice(0, 32),
  ).filter(Boolean))].slice(0, 12);
}

export async function getTimelineFeed(options: TimelineSearchOptions = {}) {
  const session = await getSession();
  if (!session) return { session: null, posts: [] };
  const followed = await prisma.savedStore.findMany({ where: { userId: session.userId }, select: { storeId: true } });
  const storeIds = followed.map((row) => row.storeId);
  const query = options.query?.trim().slice(0, 120) ?? "";
  const type = ["PRODUCT", "SERVICE", "EVENT", "STORE", "TICKET"].includes(options.type ?? "") ? options.type! : "";
  const scope = options.scope === "all" ? "all" : "following";
  if (scope === "following" && storeIds.length === 0) return { session, posts: [] };
  const conditions: Prisma.Sql[] = [Prisma.sql`bp."published" = true`, Prisma.sql`s."subscription_plan" IN ('GROWTH', 'PRO')`, Prisma.sql`s."subscription_status" = 'ACTIVE'`];
  if (scope === "following") conditions.push(Prisma.sql`bp."store_id" IN (${Prisma.join(storeIds)})`);
  if (query) {
    const pattern = `%${query}%`;
    conditions.push(Prisma.sql`(bp."caption" ILIKE ${pattern} OR s."name" ILIKE ${pattern} OR bp."attachments"::text ILIKE ${pattern} OR array_to_string(bp."search_tags", ' ') ILIKE ${pattern})`);
  }
  if (type) conditions.push(Prisma.sql`bp."attachments"::text ILIKE ${`%${type}%`}`);
  if (options.photos) conditions.push(Prisma.sql`cardinality(bp."images") > 0`);
  const matches = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT bp."id" FROM "business_posts" bp
    JOIN "stores" s ON s."id" = bp."store_id"
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY bp."created_at" DESC
    LIMIT 120
  `);
  const posts = await prisma.businessPost.findMany({
    where: { id: { in: matches.map((row) => row.id) } },
    orderBy: { createdAt: "desc" }, take: 60, include: postInclude(session.userId),
  });
  return { session, posts };
}

export async function getBusinessPost(postId: string) {
  const session = await getSession();
  const post = await prisma.businessPost.findFirst({ where: { id: postId, published: true, store: timelinePlanWhere }, include: postInclude(session?.userId) });
  return { session, post };
}

export async function getStoreTimeline(storeId: string) {
  return prisma.businessPost.findMany({
    where: { storeId, published: true, store: timelinePlanWhere }, orderBy: { createdAt: "desc" }, take: 24,
    select: { id: true, caption: true, images: true, attachments: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
  });
}

export async function getVendorTimeline() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") throw new Error("Vendor access required.");
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true, name: true, logoUrl: true, slug: true, subscriptionPlan: true, subscriptionStatus: true } });
  if (!store) return { store: null, posts: [], attachmentOptions: [] };
  const timelineEnabled = store.subscriptionStatus === "ACTIVE" && (store.subscriptionPlan === "GROWTH" || store.subscriptionPlan === "PRO");
  if (!timelineEnabled) return { store, posts: [], attachmentOptions: [], timelineEnabled };
  const [posts, attachmentOptions] = await Promise.all([
    prisma.businessPost.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { likes: true, comments: true } } } }),
    getVendorAttachmentOptions(store.id),
  ]);
  return { store, posts, attachmentOptions, timelineEnabled };
}

export async function saveBusinessPost(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Vendor access required." };
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true, slug: true, subscriptionPlan: true, subscriptionStatus: true } });
  if (!store) return { error: "Complete your store before posting." };
  if (store.subscriptionStatus !== "ACTIVE" || (store.subscriptionPlan !== "GROWTH" && store.subscriptionPlan !== "PRO")) return { error: "Timeline posting is available on active Growth and Pro plans." };
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 2200);
  const postId = String(formData.get("postId") ?? "");
  const searchTags = normalizeSearchTags(formData.getAll("searchTags").map(String));
  const existingImages = formData.getAll("existingImages").map(String).filter(Boolean).slice(0, 4);
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (!caption && !existingImages.length && !files.length) return { error: "Add a caption or at least one image." };
  if (existingImages.length + files.length > 4) return { error: "Use no more than 4 images per post." };
  const images = [...existingImages];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) return { error: "Images must be JPG, PNG or WebP and 12MB or smaller." };
    images.push(await uploadFile(file, "timeline"));
  }
  const optionMap = new Map((await getVendorAttachmentOptions(store.id)).map((item) => [item.key, item]));
  const attachments = formData.getAll("attachments").map(String).map((key) => optionMap.get(key)).filter((item): item is TimelineAttachment => Boolean(item)).slice(0, 4);
  if (postId) await prisma.businessPost.update({ where: { id: postId, storeId: store.id }, data: { caption, images, attachments, searchTags } });
  else await prisma.businessPost.create({ data: { storeId: store.id, caption, images, attachments, searchTags } });
  paths(store.slug, postId || undefined);
  return { ok: true };
}

export async function setBusinessPostPublished(postId: string, published: boolean) {
  const session = await getSession(); if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };
  const result = await prisma.businessPost.updateMany({ where: { id: postId, store: { ownerId: session.userId, ...timelinePlanWhere } }, data: { published } });
  if (!result.count) return { error: "Post not found." };
  paths(undefined, postId); return { ok: true };
}

export async function deleteBusinessPost(postId: string) {
  const session = await getSession(); if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };
  await prisma.businessPost.deleteMany({ where: { id: postId, store: { ownerId: session.userId } } });
  paths(); return { ok: true };
}

export async function toggleBusinessPostLike(postId: string) {
  const session = await getSession(); if (!session) return { error: "Sign in to like posts." };
  const post = await prisma.businessPost.findFirst({ where: { id: postId, published: true, store: timelinePlanWhere, OR: [{ store: { savedBy: { some: { userId: session.userId } } } }, { store: { ownerId: session.userId } }] }, select: { id: true, caption: true, store: { select: { ownerId: true } } } });
  if (!post) return { error: "Follow this store to interact with its posts." };
  const key = { postId_userId: { postId, userId: session.userId } };
  const liked = await prisma.businessPostLike.findUnique({ where: key });
  if (liked) await prisma.businessPostLike.delete({ where: key }); else await prisma.businessPostLike.create({ data: { postId, userId: session.userId } });
  if (!liked && post.store.ownerId !== session.userId) {
    await createNotification({ userId: post.store.ownerId, type: "GENERAL", title: `${session.fullName} liked your timeline post`, body: post.caption.slice(0, 120) || "Photo update", linkUrl: `/timeline/${postId}` });
  }
  const likeCount = await prisma.businessPostLike.count({ where: { postId } });
  paths(undefined, postId); return { ok: true, liked: !liked, likeCount };
}

export async function addBusinessPostComment(postId: string, rawBody: string, parentId?: string) {
  const session = await getSession(); if (!session) return { error: "Sign in to comment." };
  const body = rawBody.trim().slice(0, 800); if (!body) return { error: "Write a comment first." };
  const post = await prisma.businessPost.findFirst({ where: { id: postId, published: true, store: timelinePlanWhere, OR: [{ store: { savedBy: { some: { userId: session.userId } } } }, { store: { ownerId: session.userId } }] }, select: { id: true, store: { select: { ownerId: true } } } });
  if (!post) return { error: "Follow this store to join the conversation." };
  const parent = parentId ? await prisma.businessPostComment.findFirst({ where: { id: parentId, postId }, select: { userId: true, body: true } }) : null;
  if (parentId && !parent) return { error: "That comment no longer exists." };
  const comment = await prisma.businessPostComment.create({ data: { postId, userId: session.userId, parentId: parentId || null, body }, include: { user: { select: { fullName: true, role: true } } } });
  const commentCount = await prisma.businessPostComment.count({ where: { postId } });
  const recipientId = parent?.userId ?? post.store.ownerId;
  if (recipientId !== session.userId) {
    await createNotification({ userId: recipientId, type: "GENERAL", title: parent ? `${session.fullName} replied to your comment` : `${session.fullName} commented on your timeline post`, body, linkUrl: `/timeline/${postId}` });
  }
  paths(undefined, postId);
  return { ok: true, comment: { id: comment.id, body: comment.body, user: comment.user, replies: [] }, commentCount };
}
