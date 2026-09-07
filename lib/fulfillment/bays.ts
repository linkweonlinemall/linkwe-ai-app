import type { Prisma } from "@prisma/client";

/** Called inside the order transaction. A conditional claim prevents double occupancy. */
export async function assignBay(tx: Prisma.TransactionClient, splitId: string, bayNumber: number) {
  if (!Number.isInteger(bayNumber) || bayNumber < 1 || bayNumber > 9999) throw new Error("Choose a bay between 1 and 9999.");
  const legacy = await tx.splitOrder.findFirst({ where: { bayNumber, id: { not: splitId }, status: { in: ["AT_WAREHOUSE", "PACKAGED", "READY_FOR_CUSTOMER_PICKUP"] } }, select: { id: true } });
  if (legacy) throw new Error("That bay already holds another vendor order.");
  await tx.dockBay.upsert({ where: { bayNumber }, create: { bayNumber }, update: {} });
  await tx.dockBay.updateMany({ where: { splitOrderId: splitId }, data: { splitOrderId: null, isOccupied: false, assignedAt: null } });
  const claimed = await tx.dockBay.updateMany({ where: { bayNumber, splitOrderId: null, isOccupied: false }, data: { splitOrderId: splitId, isOccupied: true, assignedAt: new Date() } });
  if (claimed.count !== 1) throw new Error("That bay is occupied. Refresh and choose another bay.");
  await tx.splitOrder.update({ where: { id: splitId }, data: { bayNumber } });
}

export async function releaseBays(tx: Prisma.TransactionClient, splitIds: string[]) {
  await tx.dockBay.updateMany({ where: { splitOrderId: { in: splitIds } }, data: { splitOrderId: null, isOccupied: false, assignedAt: null } });
  await tx.splitOrder.updateMany({ where: { id: { in: splitIds } }, data: { bayNumber: null } });
}
