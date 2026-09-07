import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "./constants";
import {
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionClaims,
} from "./token";

export type Session = SessionClaims;

export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.userId }, select: { id: true, email: true, fullName: true, role: true, isActive: true, suspended: true } });
  if (!user?.isActive || user.suspended) return null;
  // Resolve current access so a role change revokes old privileges immediately.
  return { userId: user.id, email: user.email, fullName: user.fullName, role: user.role === "COURIER" ? "CUSTOMER" : user.role };
});

export async function createSession(claims: SessionClaims): Promise<void> {
  const token = await signSessionToken(claims);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions, maxAge: 0 });
}

export async function createSessionFromUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}): Promise<void> {
  await createSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });
}
