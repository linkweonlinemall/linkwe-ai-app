import { redirect } from "next/navigation";

import { getAdminUsers } from "@/app/actions/admin-users";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import AdminUsersClient from "./admin-users-client";
import AdminPageHeader from "../components/admin-page-header";
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
  const status = pickString(sp,"status") ?? "all";
  const page = Math.max(1, Number.parseInt(pickString(sp, "page") ?? "1", 10) || 1);

  const { users, total, totalPages } = await getAdminUsers({ search: q, role, status, page });

  return (
    <div className="admin-page admin-legacy">
      <AdminPageHeader eyebrow="People & support" title="People & access" description={`${total} accounts. Manage customers, business owners and the staff who keep LinkWe running.`} createHref="/dashboard/admin/records/user/new" createLabel="Add person"><Link href="/dashboard/admin/onboarding" className="admin-button">Set up a vendor →</Link></AdminPageHeader>
      <AdminUsersClient
        users={users}
        total={total}
        page={page}
        totalPages={totalPages}
        currentQ={q}
        currentRole={role}
        currentStatus={status}
      />
    </div>
  );
}
