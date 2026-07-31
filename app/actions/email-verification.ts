"use server";

import { getSession } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function verifyEmail(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedToken = token?.trim();
  if (!trimmedToken) return { ok: false, error: "Invalid or missing verification link." };

  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: trimmedToken,
      emailVerifyTokenExpiry: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user)
    return { ok: false, error: "This verification link is invalid or has expired." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiry: null,
    },
  });

  return { ok: true };
}

export async function resendVerificationEmail(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Please log in to resend." };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, fullName: true, emailVerified: true },
  });
  if (!user) return { ok: false, error: "Please log in to resend." };

  if (user.emailVerified) {
    return { ok: false, error: "Your email is already verified." };
  }

  const rateLimitKey = `resend-verification:${user.id}`;
  const rateLimit = await checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000); // 3 attempts per hour
  if (!rateLimit.allowed) {
    return { ok: false, error: "Please wait before requesting another email." };
  }

  await sendVerificationEmail(user);
  return { ok: true };
}
