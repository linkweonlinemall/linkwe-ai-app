"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";

const HIDDEN_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/chat",
  "/vendor",
  "/register",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const MOBILE_HIDDEN_PREFIXES = ["/products", "/cart", "/checkout"];

export default function PublicFloatingChatButton() {
  const pathname = usePathname() ?? "";

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  const hideOnMobile = MOBILE_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <Link
      href="/chat"
      className={`fixed right-4 bottom-[80px] z-[90] h-14 w-14 items-center justify-center rounded-full bg-[#D4450A] shadow-lg transition-opacity hover:opacity-90 lg:right-6 lg:bottom-6 ${
        hideOnMobile ? "hidden lg:flex" : "flex"
      }`}
      aria-label="Shop with AI"
    >
      <IconMessageCircle className="size-[22px] text-white" stroke={1.75} aria-hidden />
    </Link>
  );
}
