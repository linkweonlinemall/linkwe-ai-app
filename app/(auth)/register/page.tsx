import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

import { RegisterHubClient } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join LinkWe as a customer or vendor.",
};

export default async function RegisterHubPage({ searchParams }: { searchParams: Promise<{ role?: string; plan?: string }> }) {
  const sp = await searchParams;
  if (sp.role === "vendor") redirect(`/register/business${sp.plan ? `?plan=${encodeURIComponent(sp.plan)}` : ""}`);
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  return <RegisterHubClient />;
}
