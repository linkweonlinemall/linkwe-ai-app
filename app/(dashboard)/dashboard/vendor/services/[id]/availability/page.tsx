import Link from "next/link";
import { redirect } from "next/navigation";

import AvailabilityEditor from "./AvailabilityEditor";

import { getServiceAvailability } from "@/app/actions/availability";
import { getSession } from "@/lib/auth/session";

type Props = { params: Promise<{ id: string }> };

export default async function ServiceAvailabilityPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const service = await getServiceAvailability(id);
  if (!service) redirect("/dashboard/vendor/services");

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/vendor/services"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Services
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-semibold text-zinc-900">{service.name}</span>
        <span className="text-zinc-300">/</span>
        <span className="text-sm text-zinc-500">Availability</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Availability Setup</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set your working hours, breaks, and blocked dates for this service.
        </p>
      </div>

      <AvailabilityEditor
        serviceId={id}
        serviceDuration={service.serviceDuration ?? 60}
        initialSchedule={service.availabilitySchedule}
        initialOverrides={service.availabilityOverrides}
        initialSettings={{
          advanceBookingDays: service.advanceBookingDays ?? 30,
          cancellationHours: service.cancellationHours ?? 24,
          requiresApproval: service.requiresApproval ?? false,
          maxGroupSize: service.maxGroupSize ?? null,
        }}
      />
    </div>
  );
}
