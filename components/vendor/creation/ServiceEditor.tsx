import { redirect } from "next/navigation";

import { getLinkedContent } from "@/app/actions/content-links";
import EditServiceForm from "@/app/(dashboard)/dashboard/vendor/services/[id]/edit/EditServiceForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  vendorServiceDetailSelect,
  vendorServiceEditFormDefaults,
} from "@/lib/vendor/vendor-service-query";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";

type Props = { params: Promise<{ id: string }> };

export default async function ServiceEditor({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, subscriptionPlan: true, subscriptionStatus: true },
  });
  if (!store) redirect("/dashboard/vendor/creation?type=service");

  const core = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
    select: vendorServiceDetailSelect,
  });

  if (!core) redirect("/dashboard/vendor/creation?type=service");

  const service = { ...vendorServiceEditFormDefaults(), ...core };

  const { items: initialRelatedItems } = await getLinkedContent("SERVICE", core.id, {
    includeUnpublished: true,
  });

  return (
      <EditServiceForm
        service={service}
        initialRelatedItems={initialRelatedItems}
        canPayOnArrival={canVendorUsePayOnArrival(
          store.subscriptionPlan,
          store.subscriptionStatus,
        )}
      />
  );
}
