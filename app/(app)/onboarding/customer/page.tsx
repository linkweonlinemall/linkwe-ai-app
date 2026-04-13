import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

/** Legacy welcome route; customers land on their role dashboard from `resolveAuthLandingPath`. */
export default async function CustomerOnboardingRedirectPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(await resolveAuthLandingPath(user));
}
