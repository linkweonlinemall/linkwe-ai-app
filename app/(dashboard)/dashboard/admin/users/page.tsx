import { redirect } from "next/navigation";

import { getAdminUsers } from "@/app/actions/admin-users";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import AdminUsersClient from "./admin-users-client";
import CreateUser from "./create-user";
import Link from "next/link";

type Search = Record<string, string | string[] | undefined>;

function pickString(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const sp = await searchParams;
  const q = pickString(sp, "q") ?? "";
  const role = pickString(sp, "role") ?? "all";
  const page = Math.max(1, Number.parseInt(pickString(sp, "page") ?? "1", 10) || 1);

  const { users, total, totalPages } = await getAdminUsers({ search: q, role, page });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage all platform users — {total} total
        </p>
        </div>
        <Link href="/dashboard/admin/onboarding" className="inline-flex min-h-11 items-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-[#D4450A]">Open onboarding studio →</Link>
      </div>

      <CreateUser/>
      <AdminUsersClient
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        currentQ={q}
        currentRole={role}
      />
    </div>
  );
}
