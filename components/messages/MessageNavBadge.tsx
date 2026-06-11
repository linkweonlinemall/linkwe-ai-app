"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconMessage } from "@tabler/icons-react";

import { getUnreadCount } from "@/app/actions/messages";

type Props = {
  href: string;
  enabled: boolean;
  className?: string;
  iconClassName?: string;
};

export default function MessageNavBadge({
  href,
  enabled,
  className = "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.14]",
  iconClassName = "size-5 shrink-0",
}: Props) {
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;

    async function refresh() {
      const result = await getUnreadCount();
      if (cancelled) return;
      setCount("count" in result ? result.count : 0);
    }

    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Link
      href={href}
      className={className}
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
    >
      <IconMessage className={iconClassName} stroke={1.75} aria-hidden />
      {mounted && count > 0 ? (
        <span
          className="pointer-events-none absolute -right-1 top-[-3px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#D4450A] px-0.5 text-[8px] font-black leading-none text-white"
          aria-hidden
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
