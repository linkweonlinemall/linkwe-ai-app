import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getIncomingCrossStoreRequests,
  getOutgoingCrossStoreRequests,
} from "@/app/actions/cross-store";
import PartnerRequestsClient from "@/components/vendor/PartnerRequestsClient";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";

export default async function VendorPartnersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const [incomingResult, outgoingResult] = await Promise.all([
    getIncomingCrossStoreRequests(),
    getOutgoingCrossStoreRequests(),
  ]);

  const incoming = incomingResult.ok ? incomingResult.requests : [];
  const outgoing = outgoingResult.ok ? outgoingResult.requests : [];

  return (
    <div className="px-4 py-8 sm:px-6">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Partners</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Approve or manage cross-store feature requests
        </p>
      </div>

      <PartnerRequestsClient initialIncoming={incoming} initialOutgoing={outgoing} />
    </div>
  );
}
