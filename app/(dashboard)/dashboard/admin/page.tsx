import { redirect } from "next/navigation";

import AdminDashboard from "./components/admin-dashboard";
import { getSession } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AdminDashboard adminName={session.fullName ?? "Admin"} />
    </div>
  );
}
