"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconBookmark,
  IconBuildingStore,
  IconCalendarEvent,
  IconChevronRight,
  IconClipboardList,
  IconDownload,
  IconHeart,
  IconHome,
  IconLogout,
  IconMenu2,
  IconMessageCircle,
  IconPackage,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconShoppingCart,
  IconTag,
  IconTools,
} from "@tabler/icons-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import NavSearchInput, { MobileSearchOverlay } from "@/components/layout/NavSearchInput";
import MessageNavBadge from "@/components/messages/MessageNavBadge";
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

type MobileTabBase = {
  label: string;
  Icon: TablerOutlineIcon;
  isActive: (pathname: string, hash: string) => boolean;
};

type MobileTab =
  | (MobileTabBase & { href: string })
  | (MobileTabBase & { action: "more" });

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
  const drawerOpen = useDrawerOpenControlled();
  const moreSheetOpen = useDrawerOpenControlled();
  const toggleDrawerCart = useCartStore((s) => s.toggleDrawer);
  const cartBumpNonce = useCartStore((s) => s.cartBumpNonce);
  const itemCount = useCartStore((s) => s.itemCount());
  const [cartBumpPlay, setCartBumpPlay] = useState(false);
  const lastBumpRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const { isInstalled } = usePWAInstall({
    onInstalled: () => toastPWAInstalled(),
  });

  const isGetAppPage = pathname === "/get-app";
  const showSignIn = !user && !isGetAppPage;
  const isStorePage = pathname.startsWith("/store/");
  const [navScrolled, setNavScrolled] = useState(false);

  const currentPathEncoded = encodeURIComponent(pathname?.trim() ? pathname : "/");
  const loginHref = `/login?callbackUrl=${currentPathEncoded}`;
  const dashTarget = dashboardHref ?? user?.href ?? "/dashboard";
  const messagesHref = dashTarget.includes("/dashboard/vendor")
    ? "/dashboard/vendor/messages"
    : "/messages";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = () => setNavScrolled(window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [pathname]);

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
      isActive: (p) =>
        (p.startsWith("/shop") || p.startsWith("/products")) && !p.startsWith("/checkout"),
    },
    {
      href: "/search",
      label: "Search",
      Icon: IconSearch,
      isActive: (p) => p.startsWith("/search"),
    },
    {
      href: "/cart",
      label: "Cart",
      Icon: IconShoppingCart,
      isActive: (p, h) => p.startsWith("/cart") || p.startsWith("/checkout"),
    },
    {
      label: "More",
      Icon: IconMenu2,
      action: "more",
      isActive: () => false,
    },
  ];

  const roleLabel = user ? accountRoleLabel(dashboardHref, user.href) : "Customer";

  function LogoMark({ desktop }: { desktop: boolean }) {
    // Asset names describe the logo artwork: "light" belongs on dark surfaces.
    const surface = navScrolled ? "dark" : "light";
    return (
      <img
        src={
          logoVariant === "ai"
            ? `/linkwe-logo-mark-on-${surface}.png`
            : desktop
              ? `/linkwe-logo-on-${surface}.png`
              : `/linkwe-logo-mark-on-${surface}.png`
        }
        alt="LinkWe"
        className={desktop ? "block h-11 w-auto shrink-0" : "block size-11 shrink-0 object-contain"}
      />
    );
  }

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const storeNavAtTop = isStorePage && !navScrolled;
  const navIsLight = navScrolled;

  const headerPosition = isStorePage
    ? "fixed inset-x-0 top-0 z-50"
    : transparent
      ? "sticky top-0 z-40"
      : "sticky top-0 z-40";

  const glassHeader = [
    headerPosition,
    "w-full overflow-visible transition-[background-color,backdrop-filter,border-color] duration-200",
    navIsLight
      ? "public-nav-light border-b-[0.5px] border-zinc-200/80 bg-white/95 text-[#1C1C1A] shadow-sm backdrop-blur-[12px] md:backdrop-blur-[16px]"
      : storeNavAtTop
        ? "border-b-0 bg-transparent backdrop-blur-none"
        : "border-b-[0.5px] border-white/10 bg-[rgba(28,28,26,0.95)] backdrop-blur-[12px] md:backdrop-blur-[16px]",
  ].join(" ");

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
            <Link href="/" className="block shrink-0">
              <LogoMark desktop={false} />
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.1] text-white"}`}
                aria-label="Search"
              >
                <IconSearch className="size-[20px]" stroke={1.75} aria-hidden />
              </button>
              {user ? (
                <>
                  <MessageNavBadge
                    href={messagesHref}
                    enabled
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.1] text-white"}`}
                    iconClassName="size-[20px] shrink-0"
                  />
                  <button
                    type="button"
                    onClick={toggleDrawerCart}
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.1] text-white"}`}
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
                    className={`relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 text-xs font-black text-white ${navIsLight ? "border-[#D4450A]/20" : "border-white/20"}`}
                    style={{ backgroundColor: SCARLET }}
                  >
                    {initialsDisplay(user.name)}
                  </button>
                </>
              ) : showSignIn ? (
                <Link
                  href={loginHref}
                  className="flex h-8 shrink-0 items-center justify-center rounded-lg px-3.5 text-[12px] font-bold leading-none text-white"
                  style={{ backgroundColor: SCARLET }}
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
        </nav>

        {/* Desktop */}
        <nav aria-label="Primary desktop" className="hidden h-[60px] w-full min-w-0 items-center gap-4 overflow-visible px-8 md:flex">
          <Link href="/" className="shrink-0">
            <LogoMark desktop />
          </Link>

          <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-visible px-2 lg:px-6">
            <div className="w-full max-w-[420px] min-w-[180px] overflow-visible">
              <NavSearchInput variant="desktop" inputId="public-nav-desktop-search" light={navIsLight} />
            </div>
          </div>

          <div className="flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/shop"
              className={`${desktopNavLinkClass} ${
                navIsLight ? (desktopBrowseActive("/shop") ? "bg-zinc-100 text-[#1C1C1A]" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]") : (desktopBrowseActive("/shop") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconShoppingBag className="size-4 shrink-0" stroke={1.75} aria-hidden /> Shop
            </Link>
            <Link
              href="/services"
              className={`${desktopNavLinkClass} ${
                pathname.startsWith("/services") || pathname.startsWith("/service")
                  ? (navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.12] text-white")
                  : (navIsLight ? "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconTools className="size-4 shrink-0" stroke={1.75} aria-hidden /> Services
            </Link>
            <Link
              href="/stores"
              className={`${desktopNavLinkClass} ${
                navIsLight ? (desktopBrowseActive("/stores") ? "bg-zinc-100 text-[#1C1C1A]" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]") : (desktopBrowseActive("/stores") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconBuildingStore className="size-4 shrink-0" stroke={1.75} aria-hidden /> Stores
            </Link>
            <Link
              href="/events"
              className={`${desktopNavLinkClass} ${
                navIsLight ? (pathname.startsWith("/events") ? "bg-zinc-100 text-[#1C1C1A]" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]") : (pathname.startsWith("/events") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconCalendarEvent className="size-4 shrink-0" stroke={1.75} aria-hidden /> Events
            </Link>
            <Link
              href="/pricing"
              className={`${desktopNavLinkClass} ${
                navIsLight ? (pathname.startsWith("/pricing") ? "bg-zinc-100 text-[#1C1C1A]" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]") : (pathname.startsWith("/pricing") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconTag className="size-4 shrink-0" stroke={1.75} aria-hidden /> Pricing
            </Link>
            <Link
              href="/chat"
              className={`${desktopNavLinkClass} ${
                navIsLight ? (pathname.startsWith("/chat") ? "bg-zinc-100 text-[#1C1C1A]" : "text-zinc-600 hover:bg-zinc-100 hover:text-[#1C1C1A]") : (pathname.startsWith("/chat") ? "bg-white/[0.12] text-white" : "text-white/[0.7] hover:bg-white/[0.08] hover:text-white")
              }`}
            >
              <IconMessageCircle className="size-4 shrink-0" stroke={1.75} aria-hidden /> AI
            </Link>
            {mounted && !isInstalled ? (
              <Link href="/get-app" className={`ml-1 shrink-0 text-[11px] font-semibold ${navIsLight ? "text-zinc-500 hover:text-zinc-900" : "text-white/[0.55] hover:text-white"}`}>
                Get app
              </Link>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <MessageNavBadge href={messagesHref} enabled className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] ${navIsLight ? "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200" : "border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.14]"}`} />
                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] border-[0.5px] [&_button]:rounded-[10px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none [&_button]:hover:bg-transparent ${navIsLight ? "border-zinc-200 bg-zinc-100 text-zinc-800" : "border-white/[0.12] bg-white/[0.08] text-white"}`}>
                  <NotificationBell initialUnreadCount={unreadCount} variant={navIsLight ? "light" : "dark"} compactToolbar />
                </div>
                <button
                  type="button"
                  aria-label="Open cart"
                  onClick={toggleDrawerCart}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] ${navIsLight ? "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200" : "border-white/[0.12] bg-white/[0.08] text-white hover:bg-white/[0.14]"}`}
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
                  className={`flex h-[34px] min-w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-black text-white ${navIsLight ? "border-[#D4450A]/20" : "border-white/20"}`}
                  style={{ backgroundColor: SCARLET }}
                  onClick={() => drawerOpen.toggle()}
                >
                  {initialsDisplay(user.name)}
                </button>
              </>
            ) : showSignIn ? (
              <Link href={loginHref} className="flex h-9 shrink-0 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold text-white" style={{ backgroundColor: SCARLET }}>
                Sign in
              </Link>
            ) : null}
          </div>
        </nav>
      </header>

      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
      />

      <PublicMoreSheet
        open={moreSheetOpen.value}
        onClose={moreSheetOpen.close}
        user={user}
        loginHref={loginHref}
        dashTarget={dashTarget}
        isInstalled={mounted && isInstalled}
      />

      {/* Mobile bottom tab */}
      <div
        role="navigation"
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-[100] border-t-[0.5px] border-[var(--color-border-tertiary)] bg-white lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid h-[60px] max-w-lg grid-cols-5">
          {mobileTabs.map((tab) => {
            const active =
              tab.label === "More"
                ? moreSheetOpen.value
                : tab.isActive(pathname, hash);
            const tabClass =
              "relative flex min-w-0 flex-col items-center justify-center gap-[3px] px-1 transition-colors duration-150";

            const tabInner = (
              <>
                {active ? (
                  <span
                    className="mb-px h-[2px] w-[3px] shrink-0 rounded-full bg-[#D4450A]"
                    aria-hidden
                  />
                ) : (
                  <span className="mb-px h-[2px] w-[3px] shrink-0" aria-hidden />
                )}
                <span className="relative inline-flex">
                  <tab.Icon
                    className={`size-[22px] shrink-0 transition-colors duration-150 ${
                      tab.label === "Cart" && cartBumpPlay ? "lw-cart-icon-bump" : ""
                    } ${active ? "text-[#D4450A]" : "text-[var(--color-text-secondary)]"}`}
                    stroke={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                  {tab.label === "Cart" && mounted && itemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#D4450A] px-0.5 text-[8px] font-semibold text-white">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`text-[10px] leading-none transition-colors duration-150 ${
                    active
                      ? "font-semibold text-[#D4450A]"
                      : "font-medium text-[var(--color-text-secondary)]"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );

            if ("action" in tab && tab.action === "more") {
              return (
                <button
                  key={tab.label}
                  type="button"
                  className={tabClass}
                  aria-expanded={moreSheetOpen.value}
                  aria-haspopup="dialog"
                  onClick={() => moreSheetOpen.toggle()}
                >
                  {tabInner}
                </button>
              );
            }

            if (!("href" in tab)) return null;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={tabClass}
                aria-current={active ? "page" : undefined}
              >
                {tabInner}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PublicMoreSheet({
  open,
  onClose,
  user,
  loginHref,
  dashTarget,
  isInstalled,
}: {
  open: boolean;
  onClose: () => void;
  user: { name: string; href: string } | null;
  loginHref: string;
  dashTarget: string;
  isInstalled: boolean;
}) {
  const gridLinks: {
    href: string;
    label: string;
    Icon: TablerOutlineIcon;
    authOnly?: boolean;
  }[] = [
    { href: "/services", label: "Services", Icon: IconTools },
    { href: "/stores", label: "Stores", Icon: IconBuildingStore },
    { href: "/events", label: "Events", Icon: IconCalendarEvent },
    { href: "/pricing", label: "Pricing", Icon: IconTag },
    { href: "/chat", label: "AI Chat", Icon: IconMessageCircle },
    { href: "/orders", label: "My Orders", Icon: IconPackage, authOnly: true },
    { href: "/wishlist", label: "My Wishlist", Icon: IconHeart, authOnly: true },
    { href: "/saved-stores", label: "Saved Stores", Icon: IconBookmark, authOnly: true },
    { href: "/get-app", label: "Get App", Icon: IconDownload },
  ];

  const visibleLinks = gridLinks.filter((item) => {
    if (item.href === "/get-app" && isInstalled) return false;
    if (item.authOnly && !user) return false;
    return true;
  });

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-[110] bg-[rgba(0,0,0,0.5)] lg:hidden"
        onClick={onClose}
        aria-hidden={false}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More menu"
        className={`fixed inset-x-0 bottom-0 z-[111] max-h-[min(85vh,560px)] overflow-y-auto rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom,0px)+12px)] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <span className="h-1 w-10 rounded-full bg-[var(--color-border-tertiary)]" aria-hidden />
        </div>

        {user ? (
          <div className="flex items-center gap-3 border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 pb-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ backgroundColor: SCARLET }}
              aria-hidden
            >
              {initialsDisplay(user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#1C1C1A]">Hi {user.name.split(/\s+/)[0] ?? user.name}</p>
              <Link
                href={dashTarget}
                onClick={onClose}
                className="mt-0.5 text-[12px] font-medium text-[#D4450A] hover:underline"
              >
                My dashboard →
              </Link>
            </div>
          </div>
        ) : (
          <div className="border-b border-[0.5px] border-[var(--color-border-tertiary)] px-4 pb-4">
            <p className="text-[15px] font-semibold text-[#1C1C1A]">Welcome to LinkWe</p>
            <Link href={loginHref} onClick={onClose} className="mt-1 text-[12px] font-medium text-[#D4450A] hover:underline">
              Sign in →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 p-4">
          {visibleLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white p-4 text-center transition-colors hover:bg-[#F7F7F6]"
              style={{ border: "0.5px solid var(--color-border-tertiary)" }}
            >
              <item.Icon className="size-6 text-[#D4450A]" stroke={1.75} aria-hidden />
              <span className="text-[11px] font-medium text-[#1C1C1A]">{item.label}</span>
            </Link>
          ))}
        </div>

        {user ? (
          <form action={logoutAction} className="px-4 pt-1">
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[0.5px] border-[var(--color-border-tertiary)] text-[13px] font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB]"
              onClick={onClose}
            >
              <IconLogout className="size-[18px]" stroke={1.75} aria-hidden />
              Sign out
            </button>
          </form>
        ) : null}
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
