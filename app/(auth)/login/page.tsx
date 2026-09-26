import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "./login-form";
import s from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Sign in", description: "Welcome back to your local world. Sign in to LinkWe." };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string; message?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(await resolveAuthLandingPath(user));
  const { callbackUrl, error, message } = await searchParams;
  return <AuthShell eyebrow="A little closer to local" title="Good to have you back." description="Sign in to pick up where you left off. One account for your orders, plans and business.">
    <LoginForm callbackUrl={callbackUrl} oauthError={error} passwordReset={message === "Password reset successfully"}/>
    <p className={s.bottomText}>New around here? <Link href="/register">Create an account</Link></p>
  </AuthShell>;
}
