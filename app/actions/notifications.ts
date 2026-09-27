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

export async function markAllNotificationsRead(before?: string) {
  const session = await getSession();
  if (!session) return;

  await prisma.notification.updateMany({
    where: { userId: session.userId, isRead: false, createdAt: { lte: before && Number.isFinite(Date.parse(before)) ? new Date(Math.min(Date.parse(before), Date.now())) : new Date() } },
    data: { isRead: true },
  });

  revalidatePath("/");
}

export async function getNotificationPage(input:{page?:number;unread?:boolean;category?:string;q?:string}={}) {
  const session=await getSession();
  if(!session)return {items:[],total:0,unread:0,page:1,pages:1,snapshot:new Date().toISOString()};
  const {NOTIFICATION_GROUPS}=await import("@/lib/notifications/display");
  const types=input.category && Object.prototype.hasOwnProperty.call(NOTIFICATION_GROUPS,input.category) ? NOTIFICATION_GROUPS[input.category as keyof typeof NOTIFICATION_GROUPS] : undefined;
  const q=typeof input.q==="string"?input.q.trim().slice(0,160):"";
  const snapshot=new Date();
  const where={userId:session.userId,...(input.unread?{isRead:false}:{}),...(types?{type:{in:[...types]}}:{}),...(q?{OR:[{title:{contains:q,mode:"insensitive" as const}},{body:{contains:q,mode:"insensitive" as const}}]}:{})};
  const [total,unread]=await Promise.all([prisma.notification.count({where}),prisma.notification.count({where:{userId:session.userId,isRead:false}})]);
  const pages=Math.max(1,Math.ceil(total/20)),page=Math.min(pages,Math.max(1,Math.floor(Number(input.page))||1));
  const items=await prisma.notification.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],take:20,skip:(page-1)*20,select:{id:true,type:true,title:true,body:true,linkUrl:true,isRead:true,createdAt:true}});
  return {items,total,unread,page,pages,snapshot:snapshot.toISOString()};
}
