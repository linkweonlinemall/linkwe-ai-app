import Link from "next/link"

import PublicNav from "@/components/layout/PublicNav"
import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor"
  if (role === "COURIER") return "/dashboard/courier"
  if (role === "ADMIN") return "/dashboard/admin"
  return "/dashboard/customer"
}

export default async function EventsPage() {
  const session = await getSession()
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null
  const continueHref = user ? getDashboardPath(user.role) : null

  return (
    <div className="min-h-screen bg-[#1C1C1A]">
      <PublicNav
        transparent
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />
      <div className="flex flex-col items-center justify-center min-h-screen
        px-4 text-center -mt-16">
        <p className="text-[#D4450A] text-sm font-bold uppercase tracking-widest mb-4">
          Coming soon
        </p>
        <h1 className="text-4xl sm:text-6xl font-black text-white mb-6">
          Events & Tickets
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mb-10 leading-relaxed">
          Buy and sell tickets to local events across Trinidad and Tobago.
          Unique QR codes, door scanning, and real-time tracking — launching soon.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/shop"
            className="px-8 py-4 bg-[#D4450A] hover:opacity-90 text-white
              font-bold rounded-xl text-base"
          >
            Browse the shop →
          </Link>
          <Link
            href="/"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white
              font-semibold rounded-xl text-base border border-white/20"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
