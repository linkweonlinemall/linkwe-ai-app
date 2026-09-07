import type { Prisma } from "@prisma/client";

/** Persist staff work alerts in the same transaction as the operational change. */
export async function alertOperations(tx: Prisma.TransactionClient, title: string, body: string, linkUrl = "/dashboard/admin?tab=linkwe-delivery") {
  const admins = await tx.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
  if (admins.length) await tx.notification.createMany({ data: admins.map(({ id }) => ({
    userId: id, type: "ORDER_STATUS_UPDATED" as const, title, body, linkUrl,
  })) });
}
