import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreByOwnerId } from "@/lib/store/get-vendor-store";
import { prisma } from "@/lib/prisma";
import { EditListingForm } from "./edit-listing-form";

type Props = { params: Promise<{ listingId: string }> };

export default async function EditListingPage({ params }: Props) {
  const { listingId } = await params;
  if (!listingId?.trim()) {
    notFound();
  }

  const user = await getCurrentUser();
  if (!user || user.role !== "VENDOR") {
    redirect("/login");
  }

  const store = await getStoreByOwnerId(user.id);
  if (!store) {
    redirect("/onboarding/business/step-3");
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, storeId: store.id },
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      shortDescription: true,
      priceMinor: true,
      status: true,
    },
  });

  if (!listing) {
    notFound();
  }

  return (
    <div className="flex min-h-full justify-center px-6 py-12">
      <EditListingForm
        imageUrl={listing.imageUrl}
        listingId={listing.id}
        priceMinor={listing.priceMinor}
        shortDescription={listing.shortDescription}
        slug={listing.slug}
        status={listing.status}
        title={listing.title}
      />
    </div>
  );
}
