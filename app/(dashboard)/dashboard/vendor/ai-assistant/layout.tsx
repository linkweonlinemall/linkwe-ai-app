import { getSession } from "@/lib/auth/session"
import { redirect } from "next/navigation"

export default async function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "VENDOR") redirect("/")

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "#0F1117" }}>
      {children}
    </div>
  )
}
