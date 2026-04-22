import Link from "next/link";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { logoutAction } from "@/app/(auth)/auth-actions";

const ROLE_LABEL: Record<UserRole, string> = {
  CUSTOMER: "CUSTOMER",
  VENDOR: "VENDOR",
  COURIER: "COURIER",
  ADMIN: "ADMIN",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const roleLabel = ROLE_LABEL[session.role] ?? session.role;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#1C1C1A] px-4 md:px-6">
        <div className="flex min-w-0 flex-wrap items-center">
          <Link className="text-lg font-bold text-white" href={getRoleDashboardPath(session.role)}>
            LinkWe
          </Link>
          <span className="text-lg leading-none" style={{ color: "#D4450A" }}>
            ·
          </span>
          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-[#D4450A]">{roleLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="max-w-[10rem] truncate text-sm text-zinc-300 sm:max-w-[14rem] md:max-w-xs">
            {session.fullName}
          </span>
          <form action={logoutAction}>
            <button
              className="px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
