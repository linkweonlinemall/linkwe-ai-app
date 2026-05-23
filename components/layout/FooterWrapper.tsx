"use client"
import { usePathname } from "next/navigation"

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith("/dashboard")) return null
  if (pathname?.startsWith("/onboarding")) return null
  return <>{children}</>
}
