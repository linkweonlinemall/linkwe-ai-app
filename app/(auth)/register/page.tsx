import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

import { RegisterHubClient } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Join LinkWe as a customer, vendor, or courier.",
};

export default async function RegisterHubPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  return <RegisterHubClient />;
}
