"use server";

import crypto from "crypto";

import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { BASE_URL } from "@/lib/email/resend";

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true } | { error: string }> {
  email = email?.trim().toLowerCase();
  if (!email) return { error: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter a valid email address" };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true },
  });

  // Always return ok even if user not found — prevents email enumeration
  if (!user) return { ok: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const resetUrl = `${BASE_URL}/reset-password?token=${token}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your LinkWe password",
      html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #D4450A; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #444; margin-bottom: 24px;">Hey ${user.fullName}, we received a request to reset your LinkWe password.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #D4450A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;">Reset Password</a>
        <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
        <p style="color: #ccc; font-size: 12px; margin-top: 32px;">LinkWe Online Directory · Trinidad & Tobago</p>
      </div>
    `,
    });
    console.log("PASSWORD RESET EMAIL SENT TO:", user.email);
  } catch (emailErr) {
    console.error("PASSWORD RESET EMAIL ERROR:", emailErr);
  }

  return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<{ ok: true } | { error: string }> {
  const token = (formData.get("token") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!token) return { error: "Invalid reset link" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };
  if (password !== confirm) return { error: "Passwords do not match" };

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user)
    return { error: "This reset link is invalid or has expired. Please request a new one." };

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return { ok: true };
}
