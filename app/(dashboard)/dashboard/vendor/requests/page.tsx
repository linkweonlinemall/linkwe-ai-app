import { redirect } from "next/navigation";

import { getVendorOnDemandRequests } from "@/app/actions/on-demand";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

import VendorRequestsClient from "./VendorRequestsClient";

export default async function VendorRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const requests = await getVendorOnDemandRequests();

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">On-demand requests</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage incoming service requests from customers</p>
      </div>
      <VendorRequestsClient initialRequests={requests} />
    </div>
  );
}
