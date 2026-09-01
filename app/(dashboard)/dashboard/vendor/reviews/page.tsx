import Link from "next/link";
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

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(232,130,12,0.10),transparent_30%),linear-gradient(180deg,#fbfaf8_0%,#f4f1ed_100%)] px-3 py-5 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_top_right,rgba(232,130,12,0.38),transparent_32%),linear-gradient(135deg,#191816,#39241a)] px-5 py-6 text-white shadow-[0_22px_55px_rgba(28,28,26,0.18)] sm:px-8 sm:py-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-200">Customer voice</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            Reviews
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
            Understand what customers value, spot trends and reply with confidence.
          </p>
        </div>
      </div>

      <ReviewsTab />
    </div>
  );
}
