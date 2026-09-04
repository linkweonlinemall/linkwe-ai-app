import { redirect } from "next/navigation";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

export default async function VendorShippingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  redirect("/dashboard/vendor");
}
