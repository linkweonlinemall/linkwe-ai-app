import type { PaymentAttemptStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type FailureStatus = Extract<PaymentAttemptStatus, "FAILED" | "ERROR">;

/**
 * Records a terminal WiPay failure and removes any provisional product order.
 * The payment attempt remains as the audit record, detached from the deleted order.
 */
export async function failWiPayAttempt(
  attemptId: string,
  status: FailureStatus,
  failureMessage: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.paymentAttempt.updateMany({
      where: { id: attemptId, status: "PENDING" },
      data: { status, failureMessage: failureMessage.slice(0, 500) },
    });
    if (changed.count === 0) return false;

    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: attemptId },
      select: { purpose: true, targetId: true },
    });
    if (attempt?.purpose === "PRODUCT_ORDER") {
      await tx.mainOrder.deleteMany({
        where: { id: attempt.targetId, status: "PENDING_PAYMENT" },
      });
    }
    return true;
  });
}
