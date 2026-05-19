"use server";

import { revalidatePath } from "next/cache";

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

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      region: input.region?.trim() || null,
    },
  });

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
