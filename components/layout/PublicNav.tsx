"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconBell,
  IconBookmark,
  IconBuildingStore,
  IconCalendarEvent,
  IconChevronRight,
  IconClipboardList,
  IconHeart,
  IconHome,
  IconLogout,
  IconMessageCircle,
  IconPackage,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconShoppingCart,
  IconTools,
  IconUser,
} from "@tabler/icons-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import NotificationBell from "@/components/ui/NotificationBell";
import { toastPWAInstalled } from "@/components/ui/pwa-installed-toast";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";
import { useCartStore } from "@/lib/cart/cart-store";

const SCARLET = "#D4450A";

type TablerOutlineIcon = typeof IconHome;

type Props = {
  transparent?: boolean;
  /** Standard storefront mark; `/chat` uses AI logo glyph. */
  logoVariant?: "wordmark" | "ai";
  user?: { name: string; href: string } | null;
  dashboardHref?: string;
  unreadCount?: number;
};

type MobileTab = {
  href: string;
  label: string;
  Icon: TablerOutlineIcon;
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

function initialsDisplay(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "U";
}

function accountRoleLabel(dashboardHref: string | undefined, userHref: string | undefined): string {
  const h = dashboardHref ?? userHref ?? "";
  if (h.includes("/dashboard/vendor")) return "Vendor";
  if (h.includes("/dashboard/courier")) return "Courier";
  if (h.includes("/dashboard/admin")) return "Admin";
  return "Customer";
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
  const drawerOpen = useDrawerOpenControlled();
  const toggleDrawerCart = useCartStore((s) => s.toggleDrawer);
  const cartBumpNonce = useCartStore((s) => s.cartBumpNonce);
  const itemCount = useCartStore((s) => s.itemCount());
  const [cartBumpPlay, setCartBumpPlay] = useState(false);
  const lastBumpRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const { isInstalled } = usePWAInstall({
    onInstalled: () => toastPWAInstalled(),
  });

  const currentPathEncoded = encodeURIComponent(pathname?.trim() ? pathname : "/");
  const loginHref = `/login?callbackUrl=${currentPathEncoded}`;
  const dashTarget = dashboardHref ?? user?.href ?? "/dashboard";

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

  const mobileTabs: MobileTab[] = [
    {
      href: "/",
      label: "Home",
      Icon: IconHome,
      isActive: (p) => p === "/",
    },
    {
      href: "/shop",
      label: "Shop",
      Icon: IconShoppingBag,
      isActive: (p, h) =>
        (p.startsWith("/shop") || p.startsWith("/products")) &&
        !p.startsWith("/checkout") &&
        !(p === "/shop" && h === "#shop-search"),
    },
    {
      href: "/shop#shop-search",
      label: "Search",
      Icon: IconSearch,
      isActive: (p, h) => p.startsWith("/shop") && h === "#shop-search",
    },
    {
      href: "/cart",
      label: "Cart",
      Icon: IconShoppingCart,
      isActive: (p, h) => p.startsWith("/cart") || p.startsWith("/checkout"),
    },
    {
      href: user ? dashTarget : loginHref,
      label: "Account",
      Icon: IconUser,
      isActive: (p) => !!user && p.startsWith("/dashboard"),
    },
  ];

  const roleLabel = user ? accountRoleLabel(dashboardHref, user.href) : "Customer";

  function LogoMark({ desktop }: { desktop: boolean }) {
    const sqSize = desktop ? "h-8 w-8 rounded-lg text-[17px]" : "h-7 w-7 rounded-md text-[15px]";
    const textSize = desktop ? "text-[16px]" : "text-[15px]";
    return (
      <span className="flex items-center gap-2 shrink-0">
        {logoVariant === "ai" ? (
          <img src="/linkwe-new-logo-light-2.png" alt="" className="h-9 w-auto max-h-9 shrink-0" />
        ) : (
          <span
            className={`flex shrink-0 items-center justify-center font-black leading-none text-white ${sqSize}`}
            style={{ backgroundColor: SCARLET }}
            aria-hidden
          >
            L
          </span>
        )}
        <span className={`font-bold tracking-tight text-white ${textSize}`}>LinkWe</span>
      </span>
    );
  }

  function handleDesktopSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "").trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  const glassHeader =
    `${transparent ? "absolute inset-x-0 top-0 z-50" : "sticky top-0 z-40 border-b-[0.5px] border-white/10"} ` +
    `w-full backdrop-blur-[12px] md:backdrop-blur-[16px] ` +
    `bg-[rgba(28,28,26,0.85)] md:bg-[rgba(28,28,26,0.95)]`;

  const desktopNavLinkClass = `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors`;
  function desktopBrowseActive(forPath: "/shop" | "/services" | "/stores"): boolean {
    if (forPath === "/shop") return pathname.startsWith("/shop") || pathname.startsWith("/products");
    if (forPath === "/services") return pathname.startsWith("/services") || pathname.startsWith("/service");
    return pathname.startsWith("/stores") || pathname.startsWith("/store");
  }

  return (
    <>
      {user ? (
        <>
          {/* Overlay */}
          <div
            role="presentation"
            className={`fixed inset-0 z-[120] bg-black/50 transition-opacity duration-200 md:z-[118] ${drawerOpen.value ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={drawerOpen.close}
            aria-hidden={!drawerOpen.value}
          />
          {/* Slide panel */}
          <div
            className={`fixed right-0 top-0 z-[121] flex h-[100dvh] w-[min(20rem,85vw)] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-[200ms] ease-out md:z-[119] md:backdrop-blur-0 ${drawerOpen.value ? "translate-x-0" : "translate-x-full"}`}
            aria-hidden={!drawerOpen.value}
          >
            <div className="shrink-0 px-4 py-5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]" style={{ backgroundColor: "#1C1C1A" }}>
              <div className="relative flex items-start gap-3 pr-11">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[2.5px] border-white/20 text-sm font-black text-white"
                  style={{ backgroundColor: SCARLET }}
                  aria-hidden
                >
                  {initialsDisplay(user.name)}
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="truncate text-[14px] font-semibold text-white">{user.name}</p>
                  <p className="mt-2 inline-block rounded bg-[#E8820C] px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-[#1C1C1A]">
                    {roleLabel}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={drawerOpen.close}
                  className="absolute right-4 top-5 flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <Link
                href={dashTarget}
                onClick={drawerOpen.close}
                className="mt-3 flex items-center gap-3 rounded-[10px] px-3.5 py-3"
                style={{ backgroundColor: "#1C1C1A", borderWidth: "0.5px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.12)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white">My dashboard</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#E8820C" }}>
                    Orders · Wishlist · Account
                  </p>
                </div>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: SCARLET }}
                  aria-hidden
                >
                  <IconChevronRight className="size-4" stroke={2} aria-hidden />
                </span>
              </Link>
            </div>

            <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6 [-webkit-overflow-scrolling:touch]">
              <p className="px-5 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Browse</p>
              <div className="mt-2 space-y-[2px] px-4">
                {(
                  [
                    { href: "/", label: "Home", Icon: IconHome, active: pathname === "/" },
                    {
                      href: "/shop",
                      label: "Shop",
                      Icon: IconShoppingBag,
                      active:
                        pathname.startsWith("/shop") ||
                        pathname.startsWith("/products") ||
                        pathname.startsWith("/checkout"),
                    },
                    { href: "/services", label: "Services", Icon: IconTools, active: pathname.startsWith("/services") || pathname.startsWith("/service") },
                    {
                      href: "/stores",
                      label: "Stores",
                      Icon: IconBuildingStore,
                      active: pathname.startsWith("/stores") || pathname.startsWith("/store"),
                    },
                    { href: "/events", label: "Events", Icon: IconCalendarEvent, active: pathname.startsWith("/events") },
                    {
                      href: "/chat",
                      label: "AI Shopping",
                      Icon: IconMessageCircle,
                      active: pathname.startsWith("/chat"),
                    },
                  ] as const
                ).map((item) => (
                  <DrawerRowLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={item.Icon}
                    active={item.active}
                    onNavigate={drawerOpen.close}
                  />
                ))}
              </div>

              <div className="mx-4 my-[6px] h-px bg-[#f0f0f0]" role="presentation" />

              <p className="px-5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Account</p>
              <div className="mt-2 space-y-[2px] px-4 py-2">
                <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-[#1C1C1A]">
                    <IconBell className="size-[18px] shrink-0 text-[#1C1C1A]" stroke={1.75} aria-hidden /> Notifications
                  </span>
                  <NotificationBell initialUnreadCount={unreadCount} variant="light" compactToolbar />
                </div>
              </div>
              <div className="space-y-[2px] px-4 pb-2">
                {(
                  [
                    { href: "/orders", label: "My orders", Icon: IconPackage },
                    { href: "/wishlist", label: "My wishlist", Icon: IconHeart },
                    { href: "/saved-stores", label: "Saved stores", Icon: IconBookmark },
                    { href: "/my-requests", label: "My requests", Icon: IconClipboardList },
                    { href: `${user.href}/settings`, label: "Settings", Icon: IconSettings },
                  ] as const
                ).map((item) => (
                  <DrawerRowLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={item.Icon}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    onNavigate={drawerOpen.close}
                  />
                ))}
              </div>

              <div className="mx-4 my-[6px] h-px bg-[#f0f0f0]" role="presentation" />

              <form action={logoutAction} className="px-4 pt-2">
                <button
                  type="submit"
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-[11px] py-2 text-left text-[13px] font-medium transition-colors hover:bg-[#FEF0EB]"
                  style={{ color: SCARLET }}
                  onClick={drawerOpen.close}
                >
                  <IconLogout className="size-[18px] shrink-0" stroke={1.75} style={{ color: SCARLET }} aria-hidden /> Sign out
                </button>
              </form>
            </div>
          </div>
        </>
      ) : null}

      <header className={glassHeader}>
        {/* Mobile */}
        <nav aria-label="Primary mobile" className="flex px-4 py-3 md:hidden">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <Link href="/" className="min-w-0">
              <LogoMark desktop={false} />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/shop#shop-search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.1] text-white"
                aria-label="Search"
              >
                <IconSearch className="size-[20px]" stroke={1.75} aria-hidden />
              </Link>
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={toggleDrawerCart}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.1] text-white"
                    aria-label="Cart"
                  >
                    <IconShoppingCart
                      className={`size-[20px] ${cartBumpPlay ? "lw-cart-icon-bump" : ""}`}
                      stroke={1.75}
                      aria-hidden
                    />
                    {mounted && itemCount > 0 ? (
                      <span className="absolute -right-1 top-[-3px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#D4450A] px-0.5 text-[8px] font-black text-white">
                        {itemCount > 9 ? "9+" : itemCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label="Open account menu"
                    onClick={() => drawerOpen.toggle()}
                    className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 border-white/20 text-xs font-black text-white"
                    style={{ backgroundColor: SCARLET }}
                  >
                    {initialsDisplay(user.name)}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={loginHref}
                    className="flex h-8 shrink-0 items-center justify-center rounded-lg px-3.5 text-[12px] font-bold leading-none text-white"
                    style={{ backgroundColor: SCARLET }}
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Desktop */}
        <nav aria-label="Primary desktop" className="hidden h-[60px] w-full min-w-0 items-center gap-4 px-8 md:flex">
          <Link href="/" className="shrink-0">
            <LogoMark desktop />
          </Link>

          <div className="flex min-h-0 min-w-0 flex-1 justify-center px-2 lg:px-6">
            <form className="w-full max-w-[420px] min-w-[180px]" onSubmit={handleDesktopSearchSubmit}>
              <div className="relative flex h-[38px] items-center rounded-[10px] border-[0.5px] border-white/[0.15] bg-white/[0.10] px-4">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-white/50" stroke={1.75} aria-hidden />
                <label htmlFor="public-nav-desktop-search" className="sr-only">
                  Search
                </label>
                <input
                  id="public-nav-desktop-search"
                  type="search"
                  name="q"
                  placeholder="Search products, stores, services..."
                  className="h-full w-full border-0 bg-transparent pl-[30px] pr-2 text-sm text-white caret-white outline-none placeholder:text-[13px] placeholder:text-white/40"
                  autoComplete="off"
                />
              </div>
            </form>
          </div>

          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/shop"
              className={`${desktopNavLinkClass} ${
                desktopBrowseActive("/shop") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <IconShoppingBag className="size-4 shrink-0" stroke={1.75} aria-hidden /> Shop
            </Link>
            <Link
              href="/services"
              className={`${desktopNavLinkClass} ${
                pathname.startsWith("/services") || pathname.startsWith("/service")
                  ? "bg-white/[0.12] text-white"
                  : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <IconTools className="size-4 shrink-0" stroke={1.75} aria-hidden /> Services
            </Link>
            <Link
              href="/stores"
              className={`${desktopNavLinkClass} ${
                desktopBrowseActive("/stores") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <IconBuildingStore className="size-4 shrink-0" stroke={1.75} aria-hidden /> Stores
            </Link>
            <Link
              href="/events"
              className={`${desktopNavLinkClass} ${
                pathname.startsWith("/events") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <IconCalendarEvent className="size-4 shrink-0" stroke={1.75} aria-hidden /> Events
            </Link>
            <Link
              href="/chat"
              className={`${desktopNavLinkClass} ${
                pathname.startsWith("/chat") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <IconMessageCircle className="size-4 shrink-0" stroke={1.75} aria-hidden /> AI
            </Link>
            {mounted && !isInstalled ? (
              <Link href="/get-app" className="ml-1 shrink-0 text-[11px] font-semibold text-white/[0.55] hover:text-white">
                Get app
              </Link>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border-[0.5px] border-white/[0.12] bg-white/[0.08] text-white [&_button]:rounded-[10px] [&_button]:bg-transparent [&_button]:border-0 [&_button]:shadow-none [&_button]:hover:bg-transparent">
                  <NotificationBell initialUnreadCount={unreadCount} variant="dark" compactToolbar />
                </div>
                <button
                  type="button"
                  aria-label="Open cart"
                  onClick={toggleDrawerCart}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.14]"
                >
                  <IconShoppingCart
                    className={`size-5 shrink-0 ${cartBumpPlay ? "lw-cart-icon-bump" : ""}`}
                    stroke={1.75}
                    aria-hidden
                  />
                  {mounted && itemCount > 0 ? (
                    <span className="absolute -right-1 top-[-3px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#D4450A] px-0.5 text-[8px] font-black text-white">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-haspopup="dialog"
                  aria-expanded={drawerOpen.value}
                  className="flex h-[34px] min-w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-white/20 text-xs font-black text-white"
                  style={{ backgroundColor: SCARLET }}
                  onClick={() => drawerOpen.toggle()}
                >
                  {initialsDisplay(user.name)}
                </button>
              </>
            ) : (
              <Link href={loginHref} className="flex h-9 shrink-0 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold text-white" style={{ backgroundColor: SCARLET }}>
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile bottom tab */}
      <div
        role="navigation"
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-[100] border-t-[0.5px] border-[#e8e8e8] bg-white lg:hidden pb-[max(8px,calc(env(safe-area-inset-bottom,0px)+4px))] pt-2"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 pb-px">
          {mobileTabs.map((tab) => {
            const active = tab.isActive(pathname, hash);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative flex min-h-[48px] min-w-0 flex-col items-center justify-start gap-0.5 px-1 pb-2 pt-0.5 text-center"
                aria-current={active ? "page" : undefined}
              >
                <span className="relative inline-flex">
                  <tab.Icon
                    className={`size-5 shrink-0 ${tab.label === "Cart" && cartBumpPlay ? "lw-cart-icon-bump" : ""} ${active ? "text-[#D4450A]" : "text-[#aaa]"}`}
                    stroke={active ? 2.35 : 1.75}
                    aria-hidden
                  />
                  {tab.label === "Cart" && mounted && itemCount > 0 ? (
                    <span className="absolute -right-2 -top-[3px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#D4450A] px-0.5 text-[8px] font-black text-white shadow-sm">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`leading-tight tracking-[0.02em] text-[9px] ${active ? "font-bold text-[#D4450A]" : "font-medium text-[#aaa]"}`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function DrawerRowLink({
  href,
  label,
  Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: TablerOutlineIcon;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-[11px] py-2 text-[13px] font-medium transition-colors ${
        active ? "bg-[#FEF0EB]" : "hover:bg-[#FEF0EB]"
      } ${active ? "text-[#D4450A]" : "text-[#1C1C1A]"}`}
    >
      <Icon className="size-[18px] shrink-0" stroke={1.75} style={{ color: active ? SCARLET : "#1C1C1A" }} aria-hidden />
      {label}
    </Link>
  );
}

function useDrawerOpenControlled() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  return { value: open, toggle, close };
}
