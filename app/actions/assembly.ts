"use server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/** Legacy links now lead to the consolidated warehouse workflow. */
export async function markPackaged(_formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
  redirect("/dashboard/admin?tab=linkwe-delivery");
}
export async function bundleAndDispatch(_formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/");
  redirect("/dashboard/admin?tab=linkwe-delivery");
}
