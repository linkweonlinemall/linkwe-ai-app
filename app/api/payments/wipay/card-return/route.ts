import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const enrollmentId = url.searchParams.get("enrollment") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const transactionId = url.searchParams.get("transaction_id") ?? "";
  const providerUuid = url.searchParams.get("uuid") ?? "";
  const enrollment = await prisma.wiPayCardEnrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (
    !enrollment ||
    enrollment.providerTransactionId !== transactionId ||
    status !== "success" ||
    !/^[0-9a-f-]{36}$/i.test(providerUuid)
  ) {
    return NextResponse.redirect(new URL("/?card=failed", request.url));
  }

  await prisma.$transaction(async (tx) => {
    await tx.wiPayTrustedCard.upsert({
      where: { providerUuid },
      create: {
        userId: enrollment.userId,
        providerUuid,
        enrollmentTransactionId: transactionId,
      },
      update: {
        userId: enrollment.userId,
        enrollmentTransactionId: transactionId,
        status: "PENDING_VERIFICATION",
        deletedAt: null,
      },
    });
    await tx.wiPayCardEnrollment.update({
      where: { id: enrollment.id },
      data: { completedAt: new Date() },
    });
  });

  return NextResponse.redirect(
    new URL(`/payments/wipay/verify-card?enrollment=${encodeURIComponent(enrollment.id)}`, request.url),
  );
}
