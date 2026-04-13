import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getStoreByOwnerId = cache(async (ownerId: string) => {
  return prisma.store.findFirst({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      region: true,
      categoryId: true,
      status: true,
      onboardingStep: true,
      logoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});
