import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import type { UserRole } from "@prisma/client";

const ROLE_CARDS: { role: UserRole; title: string; body: string }[] = [
  {
    role: "CUSTOMER",
    title: "Customer",
    body: "Orders, wishlists, and AI shopping assistance will live here.",
  },
  {
    role: "VENDOR",
    title: "Vendor",
    body: "Store settings, catalog tools, and payouts will live here.",
  },
  {
    role: "COURIER",
    title: "Courier",
    body: "Assignments, routes, and proof-of-delivery will live here.",
  },
  {
    role: "ADMIN",
    title: "Admin",
    body: "Internal controls and moderation will live here.",
  },
];

export default async function DashboardLandingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const landing = await resolveAuthLandingPath(user);
  if (landing.startsWith("/onboarding")) {
    redirect(landing);
  }

  const primary = getRoleDashboardPath(user.role);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Welcome back, {user.fullName}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          You are signed in as{" "}
          <span className="font-medium text-zinc-900 capitalize">{user.role.toLowerCase()}</span>. Your
          primary workspace opens at{" "}
          <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline" href={primary}>
            {primary}
          </Link>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            href={primary}
          >
            Open primary workspace
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/"
          >
            Back to marketing home
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_CARDS.filter(({ role }) => user.role === role).map(({ role, title, body }) => (
          <Link
            key={role}
            className="rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:bg-zinc-50"
            href={`/dashboard/${role.toLowerCase()}`}
          >
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
            <p className="mt-4 text-sm font-medium text-zinc-900">Open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
