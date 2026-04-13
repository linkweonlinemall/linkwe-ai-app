import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleDashboardPath } from "@/lib/auth/redirects";

export default async function BusinessOnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "VENDOR") {
    redirect(getRoleDashboardPath(user.role));
  }
  return <div className="min-h-full bg-zinc-50 px-4 py-10 dark:bg-zinc-950">{children}</div>;
}
