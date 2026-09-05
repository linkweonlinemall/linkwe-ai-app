import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { safeInternalPath } from "@/lib/auth/redirects";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";

const FLOW_COOKIE = "lw_google_oauth";
const FLOW_MAX_AGE_SECONDS = 10 * 60;

export type GoogleOAuthFlow = {
  state: string;
  verifier: string;
  mode: "login" | "signup";
  signupKind: "CUSTOMER" | "BUSINESS";
  intendedPlan: IntendedPlan | null;
  callbackUrl: string;
};

function authSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) throw new Error("AUTH_SECRET must be set and at least 32 characters long.");
  return new TextEncoder().encode(raw);
}

export function googleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(origin: string): string {
  const configuredBase = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  return new URL("/api/auth/google/callback", configuredBase || origin).toString();
}

export function createGoogleOAuthValues(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export async function saveGoogleOAuthFlow(flow: GoogleOAuthFlow): Promise<void> {
  const value = await new SignJWT({ ...flow })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_MAX_AGE_SECONDS}s`)
    .sign(authSecret());

  (await cookies()).set(FLOW_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FLOW_MAX_AGE_SECONDS,
  });
}

export async function consumeGoogleOAuthFlow(): Promise<GoogleOAuthFlow | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(FLOW_COOKIE)?.value;
  cookieStore.delete(FLOW_COOKIE);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, authSecret());
    if (
      typeof payload.state !== "string" ||
      typeof payload.verifier !== "string" ||
      (payload.mode !== "login" && payload.mode !== "signup") ||
      (payload.signupKind !== "CUSTOMER" && payload.signupKind !== "BUSINESS")
    ) return null;

    return {
      state: payload.state,
      verifier: payload.verifier,
      mode: payload.mode,
      signupKind: payload.signupKind,
      intendedPlan:
        payload.intendedPlan === "STARTER" || payload.intendedPlan === "GROWTH" || payload.intendedPlan === "PRO"
          ? payload.intendedPlan
          : null,
      callbackUrl: safeInternalPath(typeof payload.callbackUrl === "string" ? payload.callbackUrl : undefined, ""),
    };
  } catch {
    return null;
  }
}
