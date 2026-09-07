import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) return null;

  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  return user ? { ...user, role: session.role } : null;
}
