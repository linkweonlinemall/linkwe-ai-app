import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSecretKey(): Uint8Array | null {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) return null;
  return new TextEncoder().encode(raw);
}

export type SessionClaims = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
};

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "CUSTOMER" ||
    value === "VENDOR" ||
    value === "COURIER" ||
    value === "ADMIN"
  );
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const secret = getSecretKey();
  if (!secret) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  }

  return new SignJWT({
    email: claims.email,
    fullName: claims.fullName,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const secret = getSecretKey();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const fullName =
      typeof payload.fullName === "string"
        ? payload.fullName
        : typeof (payload as { displayName?: string }).displayName === "string"
          ? (payload as { displayName: string }).displayName
          : null;
    let role: UserRole | null =
      typeof payload.role === "string" && isUserRole(payload.role) ? payload.role : null;
    if (!role) {
      const rawRoles = (payload as { roles?: unknown }).roles;
      const roles = Array.isArray(rawRoles) ? rawRoles.filter(isUserRole) : [];
      if (roles.includes("ADMIN")) role = "ADMIN";
      else if (roles.includes("VENDOR")) role = "VENDOR";
      else if (roles.includes("COURIER")) role = "COURIER";
      else if (roles.includes("CUSTOMER")) role = "CUSTOMER";
    }

    if (!sub || !email || !fullName || !role) return null;

    return { userId: sub, email, fullName, role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
