import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications/push";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
      },
    });

    try {
      await sendPushNotification(input);
    } catch (error) {
      console.error("Push notification delivery failed", error);
    }
  } catch {
    // Never crash the app over a failed notification
  }
}
