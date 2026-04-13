"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionFromUser, destroySession } from "@/lib/auth/session";
import { getAuthLandingPath } from "@/lib/auth/landing";
import { safeInternalPath } from "@/lib/auth/redirects";
import { roleForSignup, type SignupKind } from "@/lib/auth/signup-kinds";
import { logPrismaError } from "@/lib/log-prisma-error";

export type AuthFormState = {
  error?: string;
};

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

function validateFullName(name: string): string | null {
  const t = name.trim();
  if (!t) return "Full name is required.";
  if (t.length > 120) return "Full name is too long.";
  return null;
}

function parseSignupKind(raw: FormDataEntryValue | null): SignupKind | null {
  const v = String(raw ?? "");
  if (v === "CUSTOMER" || v === "BUSINESS" || v === "COURIER") return v;
  return null;
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const signupKind = parseSignupKind(formData.get("signupKind"));
  if (!signupKind) {
    return { error: "Invalid registration type." };
  }

  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");

  const emailErr = validateEmail(emailRaw);
  if (emailErr) return { error: emailErr };
  const email = String(emailRaw).trim().toLowerCase();
  if (email.length === 0) {
    return { error: "Email is required." };
  }

  const pwErr = validatePassword(password);
  if (pwErr) return { error: pwErr };

  const nameErr = validateFullName(fullName);
  if (nameErr) return { error: nameErr };

  if (!process.env.DATABASE_URL) {
    return { error: "Server is missing DATABASE_URL. Add it to .env and restart the dev server." };
  }

  let existing;
  try {
    // Only `email` in `where`. Use `select: { id: true }` so Prisma does not SELECT missing
    // onboarding/signup columns when the DB is behind `schema.prisma` (avoids P2022 on read).
    existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  } catch (error) {
    logPrismaError("REGISTER FINDUNIQUE ERROR:", error);
    return { error: "We could not check if this email is already registered. Please try again in a moment." };
  }
  if (existing) return { error: "An account with this email already exists." };

  const role = roleForSignup(signupKind);

  const passwordHash = await hashPassword(password);

  const data: Prisma.UserCreateInput = {
    email,
    fullName: fullName.trim(),
    passwordHash,
    role,
  };

  let user;
  try {
    user = await prisma.user.create({ data });
  } catch (error) {
    logPrismaError("REGISTER CREATE ERROR:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }

  await createSessionFromUser(user);

  const store =
    user.role === "VENDOR"
      ? await prisma.store.findFirst({ where: { ownerId: user.id }, select: { onboardingStep: true } })
      : null;
  redirect(getAuthLandingPath(user, store));
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  const emailErr = validateEmail(emailRaw);
  if (emailErr) return { error: emailErr };
  const email = emailRaw.trim().toLowerCase();

  const pwErr = validatePassword(password);
  if (pwErr) return { error: pwErr };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { error: "Invalid email or password." };
  }
  if (!user.isActive) {
    return { error: "This account is disabled." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  await createSessionFromUser(user);

  const store =
    user.role === "VENDOR"
      ? await prisma.store.findFirst({ where: { ownerId: user.id }, select: { onboardingStep: true } })
      : null;
  const target = safeInternalPath(callbackUrl || undefined, getAuthLandingPath(user, store));
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
