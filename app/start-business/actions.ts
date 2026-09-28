"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, createSessionFromUser } from "@/lib/auth/session";
import { parseIntendedPlanParam, setIntendedPlanCookie } from "@/lib/onboarding/intended-plan";

export async function enableBusinessWorkspace(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fstart-business");
  if (session.role !== "CUSTOMER" && session.role !== "VENDOR") return { error: "This account cannot add a business workspace." };
  // Adding business access retains the user ID and every shopping relationship.
  await prisma.user.updateMany({ where: { id: session.userId, role: "CUSTOMER", isActive: true, suspended: false }, data: { role: "VENDOR" } });
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.isActive || user.suspended || user.role !== "VENDOR") return { error: "Business access could not be enabled. Please sign in again." };
  await createSessionFromUser(user);
  const plan = parseIntendedPlanParam(String(form.get("plan") ?? ""));
  if (plan) await setIntendedPlanCookie(plan);
  revalidatePath("/", "layout");
  redirect("/onboarding/business/plan");
}
