import { redirect } from "next/navigation";

import AdminDashboard from "./components/admin-dashboard";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AdminDashboard adminName={session.fullName ?? "Admin"} />
    </div>
  );
}
