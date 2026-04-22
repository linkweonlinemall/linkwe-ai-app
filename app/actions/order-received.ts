"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function markOrderReceived(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) return;

  const order = await prisma.mainOrder.findFirst({
    where: {
      id: orderId,
      buyerId: session.userId,
      status: "SHIPPED",
    },
    select: { id: true },
  });

  if (!order) return;

  await prisma.mainOrder.update({
    where: { id: orderId },
    data: {
      status: "CUSTOMER_RECEIVED",
      receivedAt: new Date(),
    },
  });

  await prisma.splitOrder.updateMany({
    where: {
      mainOrderId: orderId,
      status: {
        in: ["DISPATCHED", "BUNDLED_FOR_DISPATCH", "PACKAGED", "AT_WAREHOUSE"],
      },
    },
    data: { status: "DELIVERED" },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
