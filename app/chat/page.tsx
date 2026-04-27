import ShoppingChat from "@/components/chat/ShoppingChat"
import PublicNav from "@/components/layout/PublicNav"

export const metadata = {
  title: "Shop with AI — LinkWe",
  description: "Find products from local vendors across Trinidad & Tobago",
}

export default function ChatPage() {
  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      <PublicNav />
      <div
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <ShoppingChat />
      </div>
    </div>
  )
}
