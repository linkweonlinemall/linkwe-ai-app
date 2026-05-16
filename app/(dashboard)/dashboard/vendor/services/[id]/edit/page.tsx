import Link from "next/link";
import { redirect } from "next/navigation";

import EditServiceForm from "./EditServiceForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor/services");

  const service = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      serviceType: true,
      serviceLocation: true,
      price: true,
      serviceDuration: true,
      requiresDeposit: true,
      depositAmount: true,
      bookingPaymentMode: true,
      tags: true,
      isPublished: true,
      images: true,
      responseTime: true,
      minimumQuoteAmount: true,
      siteVisitRequired: true,
      subscriptionInterval: true,
      sessionsIncluded: true,
      subscriptionCancellationDays: true,
      subscriptionTrialPeriod: true,
      subscriptionTrialPrice: true,
      subscriptionCanPause: true,
      subscriptionPauseMaxWeeks: true,
      travelFee: true,
      serviceRadius: true,
      estimatedResponseMins: true,
      virtualPlatform: true,
      virtualMeetingInfo: true,
      maxGroupSize: true,
      quotePriceType: true,
    },
  });

  if (!service) redirect("/dashboard/vendor/services");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/vendor/services" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Services
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-semibold text-zinc-900">Edit service</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Edit Service</h1>
      <EditServiceForm service={service} />
    </div>
  );
}
