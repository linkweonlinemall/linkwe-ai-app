import Link from "next/link";
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
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link
            href="/dashboard/admin"
            className="
              mb-2 inline-flex items-center gap-1 text-sm text-zinc-400
              hover:text-zinc-700
            "
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">All Stores</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} stores on LinkWe</p>
        </div>

        <AdminStoresClient
          stores={stores}
          page={page}
          totalPages={totalPages}
          currentQ={q}
          currentStatus={status}
          currentSort={sort}
        />
      </div>
    </div>
  );
}
