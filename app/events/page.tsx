import type { Metadata } from "next";
import Link from "next/link";

import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Events · LinkWe",
  description: "Upcoming events across Trinidad & Tobago",
};

export default async function EventsPage() {
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl text-5xl shadow-lg"
          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
        >
          🎟️
        </div>
        <h1 className="font-display text-4xl font-black text-zinc-900">Events</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-zinc-500">
          Discover events, concerts, festivals and more across Trinidad & Tobago.
          This feature is coming very soon.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-xl px-6 py-3 text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
          >
            Browse the shop
          </Link>
          <Link
            href="/services"
            className="rounded-xl border-2 border-zinc-200 px-6 py-3 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-300"
          >
            Browse services
          </Link>
        </div>
      </div>
    </div>
  );
}
