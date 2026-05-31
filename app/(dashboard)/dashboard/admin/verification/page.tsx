import { redirect } from "next/navigation";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import VerificationClient from "./verification-client";

export default async function AdminVerificationPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "ADMIN");

  const vendors = await prisma.user.findMany({
    where: {
      role: "VENDOR",
      idVerificationStatus: { in: ["PENDING", "APPROVED", "REJECTED"] },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      idDocumentUrl: true,
      idVerificationStatus: true,
      idVerifiedAt: true,
      createdAt: true,
      bankDetails: {
        select: {
          bankName: true,
          accountName: true,
          accountNumber: true,
          accountType: true,
        },
      },
      storesOwned: {
        select: {
          name: true,
          slug: true,
          description: true,
          categoryId: true,
          region: true,
          logoUrl: true,
          tagline: true,
          tags: true,
          openingHours: true,
          status: true,
          images: {
            select: { url: true, position: true },
            orderBy: { position: "asc" as const },
          },
          products: {
            select: { id: true, name: true, isPublished: true },
            take: 10,
            orderBy: { createdAt: "desc" as const },
          },
          _count: {
            select: { products: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = vendors.filter((v) => v.idVerificationStatus === "PENDING");
  const reviewed = vendors.filter((v) => v.idVerificationStatus !== "PENDING");

  return (
    <div className="p-6">
      <VerificationClient pending={pending} reviewed={reviewed} />
    </div>
  );
}
