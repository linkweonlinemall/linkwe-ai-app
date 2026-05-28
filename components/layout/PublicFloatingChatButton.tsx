"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMessageCircle } from "@tabler/icons-react";

const HIDDEN_PREFIXES = ["/dashboard", "/onboarding", "/chat", "/vendor"];

export default function PublicFloatingChatButton() {
  const pathname = usePathname() ?? "";

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="fixed right-4 bottom-[80px] z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#D4450A] shadow-lg transition-opacity hover:opacity-90 lg:right-6 lg:bottom-6"
      aria-label="Shop with AI"
    >
      <IconMessageCircle className="size-[22px] text-white" stroke={1.75} aria-hidden />
    </Link>
  );
}
