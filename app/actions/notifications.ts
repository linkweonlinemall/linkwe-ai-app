"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getNotifications() {
  const session = await getSession();
  if (!session) return [];

  return prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      isRead: true,
      createdAt: true,
    },
  });
}

export async function getUnreadCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  return prisma.notification.count({
    where: { userId: session.userId, isRead: false },
  });
}

export async function markNotificationRead(notificationId: string) {
  const session = await getSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.userId },
    data: { isRead: true },
  });

  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const session = await getSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/");
}
