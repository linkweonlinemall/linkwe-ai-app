import AdminPageHeader from "../components/admin-page-header";
import { redirect } from "next/navigation";

import { getAdminListings } from "@/app/actions/admin-listings";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

import AdminListingsClient from "./admin-listings-client";

type Search = Record<string, string | string[] | undefined>;

function pickString(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminListingsPage({
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
  const type = pickString(sp, "type") ?? "all";
  const sort = pickString(sp, "sort") ?? "createdAt_desc";
  const storeId = pickString(sp, "storeId") ?? "all";
  const page = Math.max(1, parseInt(pickString(sp, "page") ?? "1", 10) || 1);

  const { listings, total, totalPages } = await getAdminListings({
    q,
    status,
    type,
    storeId,
    sort,
    page,
  });

  return (
    <div className="admin-legacy">
      <div className="admin-page">
        <AdminPageHeader title="Other listings" description={`${total} property, vehicle, event and specialist listings. Use Products and Services for the main storefront catalogue.`} createHref="/dashboard/admin/records/listing/new" createLabel="Add listing"/>

        <AdminListingsClient
          listings={listings}
          total={total}
          page={page}
          totalPages={totalPages}
          currentQ={q}
          currentStatus={status}
          currentType={type}
          currentSort={sort}
        />
      </div>
    </div>
  );
}
