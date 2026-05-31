import { Suspense } from "react";
import { redirect } from "next/navigation";

import AdminDashboard from "./components/admin-dashboard";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading…</div>}>
      <AdminDashboard adminName={session.fullName ?? "Admin"} />
    </Suspense>
  );
}
