import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { logoutAction } from "@/app/(auth)/auth-actions";
import NotificationBell from "@/components/ui/NotificationBell";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";

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

  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";
  const isVendorShell = pathname.startsWith("/dashboard/vendor");
  const isAdminShell = pathname.startsWith("/dashboard/admin");

  if (isVendorShell) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F7F5F2]">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  if (isAdminShell) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F5F5F5]">
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    );
  }

  const roleLabel = ROLE_LABEL[session.role] ?? session.role;

  const unreadCount = await getNavUnreadCount();

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F5F5F5]">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#1C1C1A] px-4 md:px-6">
        <div className="flex min-w-0 flex-wrap items-center">
          <Link href="/" className="flex items-center">
            <img
              src="/linkwe-new-logo-light-2.png"
              alt="LinkWe"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <span className="text-lg leading-none" style={{ color: "#D4450A" }}>
            ·
          </span>
          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-[#D4450A]">{roleLabel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell initialUnreadCount={unreadCount} variant="dark" />
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
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
