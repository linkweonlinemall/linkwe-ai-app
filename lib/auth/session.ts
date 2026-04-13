import { cookies } from "next/headers";
import { cache } from "react";
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
  return verifySessionToken(token);
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
