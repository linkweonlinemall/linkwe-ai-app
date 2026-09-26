import Link from "next/link";
import WorkspacePage from "@/components/vendor/WorkspacePage";
import styles from "@/components/vendor/business-workspace.module.css";
import { redirect } from "next/navigation";

import ReviewsTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/reviews-tab";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { prisma } from "@/lib/prisma";

export default async function VendorReviewsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/onboarding/business/step-3");

  return <WorkspacePage eyebrow="Customer voice" title="Every review is a conversation." description="See what is working, find feedback that needs attention and reply from one place." action={<Link href="/dashboard/vendor/qr-studio" className={styles.secondary}>Share your store ↗</Link>}><ReviewsTab /></WorkspacePage>;
}
