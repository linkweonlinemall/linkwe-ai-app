import Link from "next/link";
import { redirect } from "next/navigation";

import { getVendorAvailabilityPageData } from "@/app/actions/services";
import { getSession } from "@/lib/auth/session";

import AvailabilityClient from "./AvailabilityClient";

export default async function VendorAvailabilityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getVendorAvailabilityPageData();
  if (!data) redirect("/onboarding/business/step-3");

  return (
    <div className="min-h-full bg-[#F7F5F2] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1C1A]">Availability</h1>
            <p className="mt-1 text-sm text-[#7c7b77]">
              Control when customers can book your services
            </p>
          </div>
          <Link
            href="/dashboard/vendor/services/new"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#D4450A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B83A08]"
          >
            Add service
          </Link>
        </div>

        <AvailabilityClient openingHours={data.openingHours} services={data.services} />
      </div>
    </div>
  );
}
