import Link from "next/link";
import { redirect } from "next/navigation";

import { getLinkedContent } from "@/app/actions/content-links";
import EditServiceForm from "./EditServiceForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  vendorServiceDetailSelect,
  vendorServiceEditFormDefaults,
} from "@/lib/vendor/vendor-service-query";

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

  const core = await prisma.product.findFirst({
    where: { id, storeId: store.id, isService: true },
    select: vendorServiceDetailSelect,
  });

  if (!core) redirect("/dashboard/vendor/services");

  const service = { ...vendorServiceEditFormDefaults(), ...core };

  const { items: initialRelatedItems } = await getLinkedContent("SERVICE", core.id, {
    includeUnpublished: true,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-12">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/vendor/services" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Services
        </Link>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-semibold text-zinc-900">Edit service</span>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Edit Service</h1>
      <EditServiceForm service={service} initialRelatedItems={initialRelatedItems} />
    </div>
  );
}
