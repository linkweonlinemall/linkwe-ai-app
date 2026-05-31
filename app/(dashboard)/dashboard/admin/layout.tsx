import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import AdminShell from "./components/admin-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  return (
    <Suspense fallback={null}>
      <AdminShell adminName={session.fullName ?? "Admin"}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
