import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { googleOAuthConfigured, googleRedirectUri, consumeGoogleOAuthFlow } from "@/lib/auth/google-oauth";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { safeInternalPath } from "@/lib/auth/redirects";
import { createSessionFromUser } from "@/lib/auth/session";
import { roleForSignup } from "@/lib/auth/signup-kinds";
import { setIntendedPlanCookie } from "@/lib/onboarding/intended-plan";
import { prisma } from "@/lib/prisma";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function errorRedirect(request: NextRequest, path: string, message: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const flow = await consumeGoogleOAuthFlow();
  const fallbackPath = flow?.mode === "signup"
    ? flow.signupKind === "BUSINESS" ? "/register/business" : "/register/customer"
    : "/login";

  if (!flow || request.nextUrl.searchParams.get("state") !== flow.state) {
    return errorRedirect(request, fallbackPath, "Google sign-in expired. Please try again.");
  }
  if (!googleOAuthConfigured()) {
    return errorRedirect(request, fallbackPath, "Google sign-in is not configured yet.");
  }
  if (request.nextUrl.searchParams.get("error")) {
    return errorRedirect(request, fallbackPath, "Google sign-in was cancelled.");
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return errorRedirect(request, fallbackPath, "Google did not return a sign-in code.");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(request.nextUrl.origin),
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) throw new Error("Google ID token missing");

    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      audience: process.env.GOOGLE_CLIENT_ID!,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const fullName = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!email || payload.email_verified !== true) throw new Error("Google email is not verified");

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      if (flow.mode !== "signup") {
        return errorRedirect(request, "/login", "No LinkWe account uses that Google email. Create an account first.");
      }
      user = await prisma.user.create({
        data: {
          email,
          fullName: fullName || email.split("@")[0] || "LinkWe user",
          role: roleForSignup(flow.signupKind),
          emailVerified: new Date(),
        },
      });
    }
    if (!user.isActive || user.suspended) {
      return errorRedirect(request, "/login", "This account is disabled.");
    }
    if (!user.emailVerified) {
      user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    }

    await createSessionFromUser(user);
    if (flow.signupKind === "BUSINESS" && flow.intendedPlan) await setIntendedPlanCookie(flow.intendedPlan);
    const landing = await resolveAuthLandingPath(user);
    return NextResponse.redirect(new URL(safeInternalPath(flow.callbackUrl, landing), request.url));
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return errorRedirect(request, fallbackPath, "Google sign-in could not be completed. Please try again.");
  }
}
