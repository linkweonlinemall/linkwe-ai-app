"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/uploads/upload";

const paths = () => { revalidatePath("/timeline"); revalidatePath("/dashboard/vendor/timeline"); };

export async function getTimelineFeed() {
  const session = await getSession();
  if (!session) return { session: null, posts: [] };
  const followed = await prisma.savedStore.findMany({ where: { userId: session.userId }, select: { storeId: true } });
  const storeIds = followed.map((row) => row.storeId);
  const posts = await prisma.businessPost.findMany({
    where: { published: true, storeId: { in: storeIds } }, orderBy: { createdAt: "desc" }, take: 60,
    include: {
      store: { select: { id: true, name: true, slug: true, logoUrl: true, owner: { select: { fullName: true } } } },
      likes: { where: { userId: session.userId }, select: { userId: true } },
      comments: { where: { parentId: null }, orderBy: { createdAt: "asc" }, take: 12, include: { user: { select: { id: true, fullName: true } }, replies: { orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, fullName: true } } } } } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  return { session, posts };
}

export async function getVendorTimeline() {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") throw new Error("Vendor access required.");
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true, name: true, logoUrl: true } });
  if (!store) return { store: null, posts: [] };
  const posts = await prisma.businessPost.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, include: { _count: { select: { likes: true, comments: true } } } });
  return { store, posts };
}

export async function saveBusinessPost(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Vendor access required." };
  const store = await prisma.store.findUnique({ where: { ownerId: session.userId }, select: { id: true } });
  if (!store) return { error: "Complete your store before posting." };
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 2200);
  const postId = String(formData.get("postId") ?? "");
  const existingImages = formData.getAll("existingImages").map(String).filter(Boolean).slice(0, 10);
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  if (!caption && !existingImages.length && !files.length) return { error: "Add a caption or at least one image." };
  if (existingImages.length + files.length > 10) return { error: "Use no more than 10 images per post." };
  const images = [...existingImages];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) return { error: "Images must be JPG, PNG or WebP and 12MB or smaller." };
    images.push(await uploadFile(file, "timeline"));
  }
  if (postId) await prisma.businessPost.update({ where: { id: postId, storeId: store.id }, data: { caption, images } });
  else await prisma.businessPost.create({ data: { storeId: store.id, caption, images } });
  paths(); return { ok: true };
}

export async function setBusinessPostPublished(postId: string, published: boolean) {
  const session = await getSession(); if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };
  await prisma.businessPost.updateMany({ where: { id: postId, store: { ownerId: session.userId } }, data: { published } }); paths(); return { ok: true };
}
export async function deleteBusinessPost(postId: string) {
  const session = await getSession(); if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };
  await prisma.businessPost.deleteMany({ where: { id: postId, store: { ownerId: session.userId } } }); paths(); return { ok: true };
}

export async function toggleBusinessPostLike(postId: string) {
  const session = await getSession(); if (!session) return { error: "Sign in to like posts." };
  const post = await prisma.businessPost.findFirst({ where: { id: postId, published: true, store: { savedBy: { some: { userId: session.userId } } } }, select: { id: true } });
  if (!post) return { error: "Follow this store to interact with its posts." };
  const key = { postId_userId: { postId, userId: session.userId } };
  const liked = await prisma.businessPostLike.findUnique({ where: key });
  if (liked) await prisma.businessPostLike.delete({ where: key }); else await prisma.businessPostLike.create({ data: { postId, userId: session.userId } });
  paths(); return { ok: true };
}

export async function addBusinessPostComment(postId: string, rawBody: string, parentId?: string) {
  const session = await getSession(); if (!session) return { error: "Sign in to comment." };
  if (session.role === "VENDOR") return { error: "Vendor accounts publish posts; customer accounts comment on them." };
  const body = rawBody.trim().slice(0, 800); if (!body) return { error: "Write a comment first." };
  const post = await prisma.businessPost.findFirst({ where: { id: postId, published: true, store: { savedBy: { some: { userId: session.userId } } } }, select: { id: true } });
  if (!post) return { error: "Follow this store to join the conversation." };
  if (parentId && !await prisma.businessPostComment.findFirst({ where: { id: parentId, postId } })) return { error: "That comment no longer exists." };
  await prisma.businessPostComment.create({ data: { postId, userId: session.userId, parentId: parentId || null, body } }); paths(); return { ok: true };
}
