import Link from "next/link";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { logoutAction } from "@/app/(auth)/auth-actions";

const NAV_ROLES: { role: UserRole; label: string }[] = [
  { role: "CUSTOMER", label: "Customer" },
  { role: "VENDOR", label: "Vendor" },
  { role: "COURIER", label: "Courier" },
  { role: "ADMIN", label: "Admin" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-6">
          <Link
            className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            href={getRoleDashboardPath(session.role)}
          >
            LinkWe
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            {NAV_ROLES.filter(({ role }) => session.role === role).map(({ role, label }) => (
              <Link
                key={role}
                className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
                href={`/dashboard/${role.toLowerCase()}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="font-medium text-zinc-900 dark:text-zinc-50">{session.fullName}</div>
            <div className="text-zinc-500 capitalize">{session.role.toLowerCase()}</div>
          </div>
          <form action={logoutAction}>
            <button
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
