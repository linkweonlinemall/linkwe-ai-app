import { redirect } from "next/navigation";

import AdminProductsClient from "./admin-products-client";
import {
  getAdminProducts,
  getAdminStoreOptions,
  type AdminProductFilters,
} from "@/app/actions/admin-products";
import { getSession } from "@/lib/auth/session";

const SORTS = [
  "createdAt_desc",
  "createdAt_asc",
  "price_desc",
  "price_asc",
  "name_asc",
  "name_desc",
] as const;

type Search = Record<string, string | string[] | undefined>;

function pickString(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const sp = await searchParams;

  const qRaw = pickString(sp, "q") ?? "";
  const storeId = pickString(sp, "storeId") ?? "";
  const statusRaw = pickString(sp, "status") ?? "all";
  const sortRaw = pickString(sp, "sort") ?? "createdAt_desc";
  const pageRaw = parseInt(pickString(sp, "page") ?? "1", 10);

  const status =
    statusRaw === "active" || statusRaw === "draft" || statusRaw === "all"
      ? statusRaw
      : "all";

  const sort = (SORTS as readonly string[]).includes(sortRaw)
    ? (sortRaw as NonNullable<AdminProductFilters["sort"]>)
    : "createdAt_desc";

  const filters: AdminProductFilters = {
    search: qRaw.trim() || undefined,
    storeId: storeId.trim() || undefined,
    status: status === "all" ? "all" : status,
    sort,
  };

  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

  const [stores, initial] = await Promise.all([
    getAdminStoreOptions(),
    getAdminProducts(filters, page),
  ]);

  return (
    <AdminProductsClient
      adminName={session.fullName ?? "Admin"}
      stores={stores}
      initial={initial}
      query={{
        q: qRaw,
        storeId,
        status,
        sort,
        page: initial.page,
      }}
    />
  );
}
