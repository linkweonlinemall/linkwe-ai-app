"use server";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isStoreSellable } from "@/lib/store/sellable-store";

export async function recordStorefrontView(storeId: string): Promise<void> {
  const normalizedStoreId = storeId.trim();
  if (!normalizedStoreId) return;

  const [session, store] = await Promise.all([
    getSession(),
    prisma.store.findUnique({
      where: { id: normalizedStoreId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        owner: { select: { idVerificationStatus: true } },
      },
    }),
  ]);

  if (!store || !isStoreSellable(store)) return;
  if (session && (session.userId === store.ownerId || session.role === "ADMIN")) return;

  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    await prisma.storeDailyView.upsert({
      where: { storeId_date: { storeId: store.id, date } },
      create: { storeId: store.id, date, viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
  } catch (error) {
    console.error("recordStorefrontView", error);
  }
}
