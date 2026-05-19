import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getNavUnreadCount(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) return 0;
    return prisma.notification.count({
      where: { userId: session.userId, isRead: false },
    });
  } catch {
    return 0;
  }
}
