"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { logoutAction } from "@/app/(auth)/auth-actions";
import { useCartStore } from "@/lib/cart/cart-store";

type Props = {
  transparent?: boolean;
  user?: { name: string; href: string } | null;
  dashboardHref?: string;
};

export default function PublicNav({ transparent = false, user = null, dashboardHref }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);
  const itemCount = useCartStore((s) => s.itemCount());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
    {/* Style note: pages need pb-16 sm:pb-0 on the main container on mobile so
        content is not hidden behind the bottom bar — not added automatically. */}
    <nav
      className={`w-full z-40 h-14 min-w-0 ${
        transparent
          ? "absolute left-0 right-0 top-0 bg-transparent"
          : "relative border-b border-zinc-200 bg-white shadow-sm"
      }`}
    >
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className={`shrink-0 block ${transparent ? "text-white" : "text-inherit"}`}
        >
          <img
            src={transparent ? "/linkwe-new-logo-light-2.png" : "/linkwe-new-log-dark.png"}
            alt="LinkWe"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex items-center gap-1">
            {/* Shop */}
            <Link
              href="/shop"
              title="Shop"
              className={`relative group w-9 h-9 flex items-center justify-center
      rounded-xl transition-colors
      ${
        transparent
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2
      bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap
      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              >
                Shop
              </span>
            </Link>

            {/* AI Chat */}
            <Link
              href="/chat"
              title="AI Shopping"
              className={`relative group w-9 h-9 flex items-center justify-center
      rounded-xl transition-colors
      ${
        transparent
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h8M8 14h5" strokeLinecap="round" />
              </svg>
              <span
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2
      bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap
      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              >
                AI Shopping
              </span>
            </Link>

            {/* Events */}
            <Link
              href="/events"
              title="Events"
              className={`relative group w-9 h-9 flex items-center justify-center
      rounded-xl transition-colors
      ${
        transparent
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span
                className="absolute top-full mt-1 left-1/2 -translate-x-1/2
      bg-zinc-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap
      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              >
                Events
              </span>
            </Link>
          </div>
          <button
            type="button"
            onClick={toggleDrawer}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              transparent
                ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
            aria-label="Open cart"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>

            {itemCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#D4450A" }}
              >
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            ) : null}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={`w-8 h-8 rounded-full flex items-center justify-center
        text-white text-sm font-bold transition-all
        ${menuOpen ? "ring-2 ring-[#D4450A]" : ""}
        bg-[#D4450A] hover:opacity-90`}
              >
                {user.name[0]?.toUpperCase()}
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl
        shadow-xl border border-zinc-200 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{user.name}</p>
                  </div>
                  <div className="py-1">
                    {(
                      [
                        { label: "My dashboard", href: dashboardHref ?? user.href, icon: "🏠" },
                        { label: "My orders", href: "/orders", icon: "📦" },
                        { label: "My cart", href: "/cart", icon: "🛒" },
                        { label: "Settings", href: user.href + "/settings", icon: "⚙️" },
                      ] as const
                    ).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm
                text-zinc-700 hover:bg-zinc-50 transition-colors"
                      >
                        <span className="text-base">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-zinc-100 py-1">
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                text-red-500 hover:bg-red-50 transition-colors text-left"
                      >
                        <span className="text-base">🚪</span>
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors
      ${
        transparent
          ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
          : "bg-[#D4450A] hover:opacity-90 text-white"
      }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>

    <div
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-zinc-200
        bg-white shadow-lg"
    >
      <div className="flex items-center justify-around px-2 py-2">
        <Link
          href="/"
          className="flex flex-col items-center gap-0.5 rounded-xl
      px-3 py-1 text-zinc-500 transition-colors hover:text-[#D4450A]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link
          href="/shop"
          className="flex flex-col items-center gap-0.5 rounded-xl
      px-3 py-1 text-zinc-500 transition-colors hover:text-[#D4450A]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span className="text-[10px] font-medium">Shop</span>
        </Link>

        <Link
          href="/chat"
          className="flex flex-col items-center gap-0.5 rounded-xl
      px-3 py-1 text-zinc-500 transition-colors hover:text-[#D4450A]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] font-medium">AI Chat</span>
        </Link>

        <Link
          href="/events"
          className="flex flex-col items-center gap-0.5 rounded-xl
      px-3 py-1 text-zinc-500 transition-colors hover:text-[#D4450A]"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] font-medium">Events</span>
        </Link>

        <button
          type="button"
          onClick={toggleDrawer}
          className="relative flex flex-col items-center gap-0.5 rounded-xl
        px-3 py-1 text-zinc-500 transition-colors hover:text-[#D4450A]"
        >
          <div className="relative">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {itemCount > 0 ? (
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center
            justify-center rounded-full bg-[#D4450A] text-[9px] font-bold
            text-white"
              >
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </button>
      </div>
    </div>
    </>
  );
}
