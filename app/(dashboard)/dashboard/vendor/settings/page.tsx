import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/auth-actions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProfileForm from "@/components/settings/ProfileForm";
import PasswordForm from "@/components/settings/PasswordForm";

export default async function VendorSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      region: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your account and store</p>
      </div>
      <div className="mx-auto max-w-2xl flex flex-col gap-4">
        <ProfileForm user={user} />
        <PasswordForm />

        {/* Store settings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-zinc-900">Store settings</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: "Edit store profile", href: "/dashboard/vendor/store/edit" },
              { label: "Manage products", href: "/dashboard/vendor/products" },
              { label: "Manage services", href: "/dashboard/vendor/services" },
              { label: "Availability", href: "/dashboard/vendor/staff" },
              { label: "Payouts and bank details", href: "/dashboard/vendor/finance?tab=bank-details" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                {link.label}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="mb-2 text-sm font-bold text-red-900">Sign out</h2>
          <p className="mb-4 text-xs text-red-700">
            You will be signed out of your account on this device.
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
