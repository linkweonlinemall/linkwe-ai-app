import Link from "next/link";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import styles from "@/components/vendor/business-workspace.module.css";
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

  return <WorkspacePage eyebrow="Better together" title="Grow your circle." description="Feature complementary products, services and events with the owner's approval. Manage both sides of the partnership here." action={<Link href="/stores" className={styles.secondary}>Discover stores ↗</Link>}>
    {(!incomingResult.ok || !outgoingResult.ok) && <p className={styles.error}>Collaborations could not be loaded. Please refresh and try again.</p>}
    <PartnerRequestsClient initialIncoming={incoming} initialOutgoing={outgoing}/>
  </WorkspacePage>;
}
