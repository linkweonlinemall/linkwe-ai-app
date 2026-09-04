import Link from "next/link";
import { redirect } from "next/navigation";

import ShippingSettingsClient from "@/components/vendor/ShippingSettingsClient";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function VendorShippingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  const store = await prisma.store.findUnique({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/onboarding/business/step-3");

  return (
    <div className="min-h-full bg-[#F7F5F2] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/vendor"
          className="mb-4 inline-block text-sm text-[#7c7b77] hover:text-[#1C1C1A]"
        >
          ← Back to dashboard
        </Link>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Delivery & pickup</h1>
          <p className="mt-1 text-sm text-[#7c7b77]">
            CSF courier delivery is managed by LinkWe; you can also offer local pickup per product.
          </p>
        </div>

        <ShippingSettingsClient />
      </div>
    </div>
  );
}
