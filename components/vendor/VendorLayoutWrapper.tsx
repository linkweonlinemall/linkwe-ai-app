"use client"

import { usePathname } from "next/navigation"

import VendorSidebarWrapper from "@/app/(dashboard)/dashboard/vendor/components/VendorSidebarWrapper"
import FloatingAIChat from "@/components/vendor/floating-ai-chat"

export default function VendorLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAIAssistant = pathname?.includes("/ai-assistant")

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      {!isAIAssistant && <VendorSidebarWrapper />}
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {!isAIAssistant && <FloatingAIChat />}
    </div>
  )
}
