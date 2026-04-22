import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

import { RegisterHubClient } from "./register-form";

export default async function RegisterHubPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  return <RegisterHubClient />;
}
