"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/session";
import { writeAdminPaymentTestMode } from "@/lib/admin/payment-test-mode";

async function setMode(enabled: boolean): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") throw new Error("Administrator access required.");
  await writeAdminPaymentTestMode(session.userId, enabled);
  revalidatePath("/dashboard/admin", "layout");
}

export async function enableAdminPaymentTestMode(): Promise<void> {
  await setMode(true);
}

export async function disableAdminPaymentTestMode(): Promise<void> {
  await setMode(false);
}
