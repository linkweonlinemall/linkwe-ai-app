import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CreationLauncher from "./creation-launcher";
export default async function AdminOnboardingPage() {
  if ((await getSession())?.role !== "ADMIN") redirect("/login");
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, role: true },
  });
  return <CreationLauncher users={users} />;
}
