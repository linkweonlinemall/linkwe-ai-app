import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "CUSTOMER");

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8">
      <h1 className="text-xl font-semibold text-zinc-900">Customer dashboard</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Signed-in shopping experience will live here. This route is protected and requires the Customer role.
      </p>
    </div>
  );
}
