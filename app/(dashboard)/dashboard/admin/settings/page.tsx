import { redirect } from "next/navigation";

import { logoutAction } from "@/app/(auth)/auth-actions";
import PasswordForm from "@/components/settings/PasswordForm";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import AdminPasswordManager from "./AdminPasswordManager";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true },
  });

  if (!user) redirect("/login");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Admin settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your account and all platform users
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-6">
        {/* Admin profile */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-zinc-900">Your account</h2>
          <div className="mb-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Name</span>
              <span className="font-semibold text-zinc-900">{user.fullName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Email</span>
              <span className="font-semibold text-zinc-900">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Role</span>
              <span className="rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Change own password */}
        <PasswordForm />

        {/* Change any user password */}
        <AdminPasswordManager users={users} />

        {/* Sign out */}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="mb-2 text-sm font-bold text-red-900">Sign out</h2>
          <p className="mb-4 text-xs text-red-700">
            You will be signed out of your admin account.
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
