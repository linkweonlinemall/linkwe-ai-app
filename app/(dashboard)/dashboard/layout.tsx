import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

export default async function DashboardRoutesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const landing = await resolveAuthLandingPath(user);
  if (landing.startsWith("/onboarding")) {
    redirect(landing);
  }

  return children;
}
