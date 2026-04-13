import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";

export default async function CourierDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "COURIER");

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Courier dashboard</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Delivery assignments will live here. Courier access is typically granted by operations; register as a customer
        first, then an admin can add the Courier role in the database.
      </p>
    </div>
  );
}
