import { NextRequest, NextResponse } from "next/server";

import {
  createGoogleOAuthValues,
  googleOAuthConfigured,
  googleRedirectUri,
  saveGoogleOAuthFlow,
} from "@/lib/auth/google-oauth";
import { parseIntendedPlanParam } from "@/lib/onboarding/intended-plan";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "login";
  const signupKind = request.nextUrl.searchParams.get("signupKind") === "BUSINESS" ? "BUSINESS" : "CUSTOMER";
  const fallbackPath = mode === "signup"
    ? signupKind === "BUSINESS" ? "/register/business" : "/register/customer"
    : "/login";

  if (mode === "signup" && request.nextUrl.searchParams.get("termsAccepted") !== "1") {
    return NextResponse.redirect(new URL(`${fallbackPath}?error=Accept the Terms of Service and Privacy Policy to continue.`, request.url));
  }

  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(new URL(`${fallbackPath}?error=Google sign-in is not configured yet.`, request.url));
  }

  const { state, verifier, challenge } = createGoogleOAuthValues();
  await saveGoogleOAuthFlow({
    state,
    verifier,
    mode,
    signupKind,
    intendedPlan: parseIntendedPlanParam(request.nextUrl.searchParams.get("intendedPlan")),
    callbackUrl: request.nextUrl.searchParams.get("callbackUrl") ?? "",
  });

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authorizationUrl.searchParams.set("redirect_uri", googleRedirectUri(request.nextUrl.origin));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authorizationUrl);
}
