import { getSession } from "@/lib/auth/session"
import { getStorePlan } from "@/lib/finance/store-plan"
import { getAIUsageState } from "@/lib/finance/ai-usage"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "VENDOR") redirect("/")

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      planRenewsAt: true,
      aiTopupCreditsRemaining: true,
    },
  })
  if (store) {
    const planAllowance = getStorePlan({
      subscriptionPlan: store.subscriptionPlan,
      subscriptionStatus: store.subscriptionStatus,
    }).limits.aiMonthlyAllowance
    const usage = await getAIUsageState(store)
    const aiEnabled =
      planAllowance > 0 || usage.remaining > 0 || usage.topupRemaining > 0
    if (!aiEnabled) redirect("/dashboard/vendor/finance")
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "#0F1117" }}>
      {children}
    </div>
  )
}
