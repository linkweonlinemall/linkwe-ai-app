import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRoleDashboardPath } from "@/lib/auth/redirects";

export default async function BusinessOnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "VENDOR") {
    redirect(getRoleDashboardPath(user.role));
  }
  return (
    <div className="w-full min-w-0 bg-[#F5F5F5]">
      <div className="mx-auto w-full min-w-0 max-w-2xl has-[[data-plan-picker]]:max-w-6xl">{children}</div>
    </div>
  );
}
