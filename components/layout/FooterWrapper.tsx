"use client"
import { usePathname } from "next/navigation"

export default function FooterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith("/dashboard")) return null
  if (pathname?.startsWith("/onboarding")) return null
  if (["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"].some(route => pathname === route || pathname?.startsWith(`${route}/`))) return null
  return <>{children}</>
}
