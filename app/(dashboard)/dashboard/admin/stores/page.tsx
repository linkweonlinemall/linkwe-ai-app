import AdminPageHeader from "../components/admin-page-header";
import { redirect } from "next/navigation";

import { getAdminStores } from "@/app/actions/admin-stores";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

import AdminStoresClient from "./admin-stores-client";

type Search = Record<string, string | string[] | undefined>;

function pickString(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const sp = await searchParams;
  const q = pickString(sp, "q") ?? "";
  const status = pickString(sp, "status") ?? "all";
  const sort = pickString(sp, "sort") ?? "newest";
  const page = Math.max(1, Number.parseInt(pickString(sp, "page") ?? "1", 10) || 1);

  const { stores, total, totalPages } = await getAdminStores({ q, status, sort, page });

  return (
    <div className="admin-page admin-legacy">
      <AdminPageHeader title="Stores" description={`${total} local businesses. Manage storefronts, review publication and open every owner's account.`} createHref="/dashboard/admin/records/store/new" createLabel="Add store"/>

      <AdminStoresClient
        stores={stores}
        page={page}
        totalPages={totalPages}
        currentQ={q}
        currentStatus={status}
        currentSort={sort}
      />
    </div>
  );
}
