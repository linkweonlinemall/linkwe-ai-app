import Link from "next/link";
import { redirect } from "next/navigation";

import MessagesTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/messages-tab";
import { getSession } from "@/lib/auth/session";
import { assertDashboardRole } from "@/lib/auth/assert-role";

export default async function VendorMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");

  return (
    <div className="min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#18181b] via-[#24211f] to-[#D4450A] p-5 text-white shadow-xl shadow-orange-950/10 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">Store communication</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Messages</h1>
            <p className="mt-1 text-sm text-white/70">Keep customer conversations clear, quick and organized.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs text-white/80 backdrop-blur">
            Replies refresh automatically
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <MessagesTab />
      </div>
    </div>
  );
}
