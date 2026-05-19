import Link from "next/link";
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
        select: { name: true, slug: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = vendors.filter((v) => v.idVerificationStatus === "PENDING");
  const reviewed = vendors.filter((v) => v.idVerificationStatus !== "PENDING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/dashboard/admin"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to dashboard
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">ID Verification</h1>
        <p className="mt-1 text-sm text-zinc-500">Review and approve vendor identity documents</p>
      </div>

      <VerificationClient pending={pending} reviewed={reviewed} />
    </div>
  );
}
