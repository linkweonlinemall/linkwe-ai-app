"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/** Prevents browser scroll restoration from revealing a new route at the old page's bottom. */
export default function RouteScrollManager() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
