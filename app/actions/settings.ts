"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { normalizeTTPhone } from "@/lib/phone";

import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export async function updateProfile(input: {
  fullName: string;
  phone?: string;
  region?: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  if (!input.fullName.trim()) return { error: "Name is required" };

  let phone: string | null = null;
  const phoneRaw = input.phone?.trim() ?? "";
  if (phoneRaw.length > 0) {
    const parsed = normalizeTTPhone(phoneRaw);
    if (!parsed.ok) return { error: parsed.error };
    phone = parsed.normalized;
  }

  if (phone) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phone, NOT: { id: session.userId } },
      select: { id: true },
    });
    if (phoneTaken) return { error: "That phone number is already in use." };
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        fullName: input.fullName.trim(),
        phone,
        region: input.region?.trim() || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const targets = Array.isArray(target) ? target.map(String) : target != null ? [String(target)] : [];
      if (targets.some((t) => t.toLowerCase().includes("phone"))) {
        return { error: "That phone number is already in use." };
      }
    }
    throw error;
  }

  revalidatePath("/dashboard/customer/settings");
  revalidatePath("/dashboard/vendor/settings");
  revalidatePath("/dashboard/courier/settings");
  return { ok: true };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  if (!input.currentPassword) return { error: "Current password is required" };
  if (!input.newPassword) return { error: "New password is required" };
  if (input.newPassword.length < 8)
    return { error: "New password must be at least 8 characters" };
  if (input.newPassword !== input.confirmPassword)
    return { error: "Passwords do not match" };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) return { error: "Account not found" };

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect" };

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  revalidatePath("/dashboard/customer/settings");
  revalidatePath("/dashboard/vendor/settings");
  revalidatePath("/dashboard/courier/settings");

  return { ok: true };
}

// Admin — change any user's password
export async function adminChangeUserPassword(input: {
  userId: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (session.role !== "ADMIN") return { error: "Not authorized" };

  if (!input.newPassword) return { error: "New password is required" };
  if (input.newPassword.length < 8)
    return { error: "Password must be at least 8 characters" };
  if (input.newPassword !== input.confirmPassword)
    return { error: "Passwords do not match" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });
  if (!user) return { error: "User not found" };

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: input.userId },
    data: { passwordHash: newHash },
  });

  return { ok: true };
}

// Admin — get all users for password management
export async function adminGetUsers(search?: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return [];

  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
