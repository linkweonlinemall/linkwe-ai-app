import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) return null;

  if (!session.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
  });
}