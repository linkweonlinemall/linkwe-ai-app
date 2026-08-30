import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/auth-actions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProfileForm from "@/components/settings/ProfileForm";
import PasswordForm from "@/components/settings/PasswordForm";
import { Bookmark, Heart, LockKeyhole, Package, Settings2, Sparkles, Wrench } from "lucide-react";

export default async function CustomerSettingsPage() {
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
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1C1C1A] via-[#302925] to-[#8f330d] p-6 text-white shadow-xl sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300">Your LinkWe</p><h1 className="mt-2 text-3xl font-black">Account settings</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Keep your profile, security and customer shortcuts together in one private control centre.</p></div>
            <span className="hidden rounded-2xl bg-white/10 p-4 sm:block"><Settings2 className="size-7" /></span>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="flex min-w-0 flex-col gap-5"><ProfileForm user={user} /><PasswordForm /></div>
          <div className="flex min-w-0 flex-col gap-5">

          {/* Quick links */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2"><Sparkles className="size-4 text-[#D4450A]"/><h2 className="text-sm font-bold text-zinc-900">Your customer tools</h2></div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "My orders", href: "/orders", Icon: Package },
                { label: "My bookings", href: "/bookings", Icon: LockKeyhole },
                { label: "Wishlist", href: "/wishlist", Icon: Heart },
                { label: "Saved stores", href: "/saved-stores", Icon: Bookmark },
                { label: "My requests", href: "/my-requests", Icon: Wrench },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex min-h-24 flex-col justify-between rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3 text-sm font-semibold text-zinc-700 transition-all hover:-translate-y-0.5 hover:border-[#D4450A]/20 hover:bg-[#FEF0EB]"
                >
                  <link.Icon className="size-5 text-[#D4450A]" />
                  <span>{link.label} <span className="text-[#D4450A]">→</span></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50 p-6">
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
          </div></div>
        </div>
      </div>
    </div>
  );
}
