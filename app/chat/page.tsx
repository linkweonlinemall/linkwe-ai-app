import ShoppingChat from "@/components/chat/ShoppingChat"
import PublicNav from "@/components/layout/PublicNav"
import type { Metadata } from "next"
import { getVendorChats } from "@/app/actions/vendor-chat"
import { getSession } from "@/lib/auth/session"
import { getRoleDashboardPath } from "@/lib/auth/redirects"

export const metadata: Metadata = {
  title: "AI Shopping Assistant",
  description: "Shop with AI — find products and services across LinkWe using natural language.",
}

export default async function ChatPage() {
  const session = await getSession()
  const dashboardHref = session ? getRoleDashboardPath(session.role) : null
  const chatList = session ? await getVendorChats() : []

  return (
    <div className="flex flex-col pb-16 sm:pb-0" style={{ height: "100dvh" }}>
      <PublicNav
        user={session ? { name: session.fullName ?? "Account", href: dashboardHref! } : null}
        dashboardHref={dashboardHref ?? undefined}
      />
      <div
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <ShoppingChat initialChatList={chatList} isLoggedIn={!!session} />
      </div>
    </div>
  )
}
