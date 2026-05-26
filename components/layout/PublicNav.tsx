"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import NotificationBell from "@/components/ui/NotificationBell";
import { toastPWAInstalled } from "@/components/ui/pwa-installed-toast";
import { icn } from "@/lib/iconography";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";
import { useCartStore } from "@/lib/cart/cart-store";

type Props = {
  transparent?: boolean;
  /** Standard wordmark for storefront; gradient AI logo only for AI surfaces (e.g. /chat). */
  logoVariant?: "wordmark" | "ai";
  user?: { name: string; href: string } | null;
  dashboardHref?: string;
  unreadCount?: number;
};

type MobileTab = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Hash is empty on server render; synced on client for `/shop#shop-search`. */
  isActive: (pathname: string, hash: string) => boolean;
};

function useHashFragment(): string {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
    },
    () => (typeof window !== "undefined" ? window.location.hash : ""),
    () => "",
  );
}

export default function PublicNav({
  transparent = false,
  logoVariant = "wordmark",
  user = null,
  dashboardHref,
  unreadCount = 0,
}: Props) {
  const pathname = usePathname() ?? "";
  const hash = useHashFragment();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);
  const cartBumpNonce = useCartStore((s) => s.cartBumpNonce);
  const itemCount = useCartStore((s) => s.itemCount());
  const [cartBumpPlay, setCartBumpPlay] = useState(false);
  const lastBumpRef = useRef(0);
  /** Avoid hydrating cart badges from persisted store (server renders count 0, client may differ). */
  const [mounted, setMounted] = useState(false);

  const { isInstalled, isInstallable, install } = usePWAInstall({
    onInstalled: () => toastPWAInstalled(),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (cartBumpNonce === 0) return;
    if (lastBumpRef.current === cartBumpNonce) return;
    lastBumpRef.current = cartBumpNonce;
    setCartBumpPlay(true);
    const t = window.setTimeout(() => setCartBumpPlay(false), 620);
    return () => window.clearTimeout(t);
  }, [cartBumpNonce]);

  const currentPathEncoded = encodeURIComponent(pathname?.trim() ? pathname : "/");

  const mobileTabs: MobileTab[] = [
    {
      href: "/",
      label: "Home",
      Icon: Home,
      isActive: (p, _h) => p === "/",
    },
    {
      href: "/shop",
      label: "Shop",
      Icon: ShoppingBag,
      isActive: (p, h) =>
        (p.startsWith("/shop") || p.startsWith("/products")) &&
        !p.startsWith("/checkout") &&
        !(p === "/shop" && h === "#shop-search"),
    },
    {
      href: "/shop#shop-search",
      label: "Search",
      Icon: Search,
      isActive: (p, h) => p.startsWith("/shop") && h === "#shop-search",
    },
    {
      href: "/cart",
      label: "Cart",
      Icon: ShoppingCart,
      isActive: (p, _h) => p.startsWith("/cart") || p.startsWith("/checkout"),
    },
    {
      href: user ? (dashboardHref ?? user.href) : `/login?callbackUrl=${currentPathEncoded}`,
      label: "Account",
      Icon: UserRound,
      isActive: (p, _h) =>
        !!user && (p.startsWith("/dashboard") || p.startsWith(dashboardHref ?? user.href)),
    },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const headerIconClass = transparent
    ? "text-white/80 transition-colors duration-200 ease-in-out hover:bg-white/10 hover:text-white"
    : "text-zinc-500 transition-colors duration-200 ease-in-out hover:bg-zinc-100 hover:text-[#D4450A]";

  return (
    <>
      <nav
        className={`z-40 h-14 min-h-[3.5rem] w-full min-w-0 ${
          transparent
            ? "absolute left-0 right-0 top-0 bg-transparent"
            : "relative border-b border-zinc-200 bg-white shadow-sm"
        }`}
      >
        <div className="mx-auto flex h-14 min-h-[3.5rem] w-full min-w-0 max-w-7xl items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className={`block shrink-0 ${transparent ? "text-white" : "text-inherit"}`}
          >
            <img
              src={logoVariant === "ai" ? "/linkwe-new-logo-light-2.png" : "/linkwe-new-log-dark.png"}
              alt="LinkWe"
              className={
                transparent
                  ? logoVariant === "ai"
                    ? "h-8 w-auto max-h-8 object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
                    : "h-8 w-auto object-contain brightness-0 invert drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
                  : "h-8 w-auto object-contain"
              }
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:gap-6">
            {/* Desktop nav icons — lg+ */}
            <div className="hidden items-center gap-1 lg:flex">
              <Link
                href="/stores"
                title="Stores"
                className={`group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${headerIconClass}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 22V12l7-5 7 5v10" />
                  <path d="M9 22v-7h6v7" />
                  <path strokeLinecap="round" d="M2 12h20" />
                </svg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Stores
                </span>
              </Link>

              <Link
                href="/shop"
                title="Shop"
                className={`group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${headerIconClass}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Shop
                </span>
              </Link>

              <Link
                href="/services"
                title="Services"
                className={`group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${headerIconClass}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Services
                </span>
              </Link>

              <Link
                href="/chat"
                title="AI Shopping"
                className={`group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${headerIconClass}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 10h8M8 14h5" strokeLinecap="round" />
                </svg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  AI Shopping
                </span>
              </Link>

              <Link
                href="/events"
                title="Events"
                className={`group relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${headerIconClass}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Events
                </span>
              </Link>

              {mounted && !isInstalled ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (isInstallable) {
                      await install();
                      return;
                    }
                    router.push("/get-app");
                  }}
                  className="hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:border-[#D4450A] hover:text-[#D4450A] transition-colors xl:flex"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Get app
                </button>
              ) : null}
            </div>

            {/* Bell + cart: desktop only (mobile: bell in account menu, cart in tab bar) */}
            <div className="hidden items-center gap-2 lg:flex">
              {user ? (
                <NotificationBell
                  initialUnreadCount={unreadCount}
                  variant={transparent ? "dark" : "light"}
                />
              ) : null}
              <button
                type="button"
                onClick={toggleDrawer}
                className={`relative flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  transparent
                    ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                    : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}
                aria-label="Open cart"
              >
                <span className={`inline-flex ${cartBumpPlay ? "lw-cart-icon-bump" : ""}`}>
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
                </span>
                {mounted && itemCount > 0 ? (
                  <span
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: "#D4450A" }}
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                ) : null}
              </button>
            </div>

            {user ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={`flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm font-bold text-white transition-all ${
                    menuOpen ? "ring-2 ring-[#D4450A]" : ""
                  } bg-[#D4450A] hover:opacity-90`}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  {user.name[0]?.toUpperCase()}
                </button>

                {menuOpen ? (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
                  >
                    <div className="border-b border-zinc-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-zinc-900">{user.name}</p>
                    </div>
                    <div className="border-b border-zinc-100 px-2 py-2 lg:hidden">
                      <div className="flex justify-center">
                        <NotificationBell
                          initialUnreadCount={unreadCount}
                          variant="light"
                        />
                      </div>
                    </div>
                    <div className="py-1">
                      {(
                        [
                          { label: "Home", href: "/", Icon: Home },
                          {
                            label: "My dashboard",
                            href: dashboardHref ?? user.href,
                            Icon: LayoutDashboard,
                          },
                          { label: "My requests", href: "/my-requests", Icon: ClipboardList },
                          { label: "My orders", href: "/orders", Icon: Package },
                          { label: "My wishlist", href: "/wishlist", Icon: Heart },
                          { label: "Saved stores", href: "/saved-stores", Icon: Bookmark },
                          { label: "My cart", href: "/cart", Icon: ShoppingCart },
                          { label: "Settings", href: `${user.href}/settings`, Icon: Settings },
                        ] as { label: string; href: string; Icon: LucideIcon }[]
                      ).map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex min-h-[44px] items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          <item.Icon className={icn.inline} aria-hidden />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-zinc-100 py-1">
                      <form action={logoutAction}>
                        <button
                          type="submit"
                          className="flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          <LogOut className={icn.danger} aria-hidden />
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/login?callbackUrl=${currentPathEncoded}`;
                }}
                className={`min-h-[44px] shrink-0 rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
                  transparent
                    ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                    : "bg-[#D4450A] text-white hover:opacity-90"
                }`}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar — max width < lg */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
          {mobileTabs.map((tab) => {
            const active = tab.isActive(pathname, hash);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className={`relative transition-colors duration-200 ease-in-out flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1 text-[10px] font-semibold ${
                  active ? "text-[#D4450A]" : "text-zinc-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <tab.Icon
                  className={`size-6 shrink-0 ${tab.label === "Cart" && cartBumpPlay ? "lw-cart-icon-bump" : ""} ${active ? "text-[#D4450A]" : "text-zinc-500"}`}
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                <span className="leading-none">{tab.label}</span>
                {tab.label === "Cart" && mounted && itemCount > 0 ? (
                  <span className="absolute right-[18%] top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#D4450A] px-1 text-[9px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
