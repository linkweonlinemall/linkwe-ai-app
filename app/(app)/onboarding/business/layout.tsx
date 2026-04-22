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
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="mx-auto max-w-2xl px-4 py-10">{children}</div>
    </div>
  );
}
