import ShoppingChat from "@/components/chat/ShoppingChat"
import PublicNav from "@/components/layout/PublicNav"
import { getVendorChats } from "@/app/actions/vendor-chat"
import { getSession } from "@/lib/auth/session"
import { getRoleDashboardPath } from "@/lib/auth/redirects"

export const metadata = {
  title: "Shop with AI — LinkWe",
  description: "Find products from local vendors across Trinidad & Tobago",
}

export default async function ChatPage() {
  const session = await getSession()
  const dashboardHref = session ? getRoleDashboardPath(session.role) : null
  const chatList = session ? await getVendorChats() : []

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
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
