"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
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
  IconNews,
  IconPackage,
  IconSearch,
  IconSettings,
  IconShoppingBag,
  IconShoppingCart,
  IconTag,
  IconTools,
} from "@tabler/icons-react";

import { logoutAction } from "@/app/(auth)/auth-actions";
import PublicBrowseBar from "./PublicBrowseBar";
import styles from "./public-nav.module.css";
import NavSearchInput, { MobileSearchOverlay } from "@/components/layout/NavSearchInput";
import MessageNavBadge from "@/components/messages/MessageNavBadge";
import NotificationBell from "@/components/ui/NotificationBell";
import { toastPWAInstalled } from "@/components/ui/pwa-installed-toast";
import { usePWAInstall } from "@/lib/hooks/use-pwa-install";
import { useCartStore } from "@/lib/cart/cart-store";

const SCARLET = "#D4450A";

type TablerOutlineIcon = typeof IconHome;

type Props = {
  appearance?: "default" | "home" | "storefront";
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

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

function LogoMark({ desktop, home }: { desktop: boolean; home: boolean }) {
  return <Image src={home ? "/linkwe-logo-mark-on-light.png" : "/linkwe-logo-mark-on-dark.png"} alt="LinkWe" width={64} height={64} priority className={`block shrink-0 object-contain ${desktop ? "h-[64px] w-[64px]" : "h-[52px] w-[52px]"}`} />;
}

export default function PublicNav({
  appearance = "default",
  user = null,
  dashboardHref,
  unreadCount = 0,
}: Props) {
  const isHomeAppearance = appearance === "home";
  const pathname = usePathname() ?? "";
  const hash = useHashFragment();
  const drawerOpen = useDrawerOpenControlled();
  const moreSheetOpen = useDrawerOpenControlled();
  const toggleDrawerCart = useCartStore((s) => s.toggleDrawer);
  const cartBumpNonce = useCartStore((s) => s.cartBumpNonce);
  const itemCount = useCartStore((s) => s.itemCount());
  const mounted = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const cartBumpPlay = mounted && cartBumpNonce > 0;

  const { isInstalled } = usePWAInstall({
    onInstalled: () => toastPWAInstalled(),
  });

  const isGetAppPage = pathname === "/get-app";
  const showSignIn = !user && !isGetAppPage;

  const currentPathEncoded = encodeURIComponent(pathname?.trim() ? pathname : "/");
  const loginHref = `/login?callbackUrl=${currentPathEncoded}`;
  const dashTarget = dashboardHref ?? user?.href ?? "/dashboard";
  const messagesHref = dashTarget.includes("/dashboard/vendor")
    ? "/dashboard/vendor/messages"
    : "/messages";

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
      href: "/timeline",
      label: "Timeline",
      Icon: IconNews,
      isActive: (p) => p.startsWith("/timeline"),
    },
    {
      href: "/cart",
      label: "Cart",
      Icon: IconShoppingCart,
      isActive: (p) => p.startsWith("/cart") || p.startsWith("/checkout"),
    },
    {
      label: "More",
      Icon: IconMenu2,
      action: "more",
      isActive: () => false,
    },
  ];

  const roleLabel = user ? accountRoleLabel(dashboardHref, user.href) : "Customer";


  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navIsLight = isHomeAppearance;
  const glassHeader = [
    "sticky top-0 z-40",
    "w-full overflow-visible transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300",
    isHomeAppearance
      ? "public-nav-light border-b border-zinc-200/70 bg-white/90 text-[#1C1C1A] shadow-[0_12px_35px_rgba(28,28,26,0.08)] backdrop-blur-[18px]"
      : styles.header,
  ].join(" ");

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
                    { href: "/timeline", label: "Timeline", Icon: IconNews },
                    { href: "/event-collections", label: "Event collections", Icon: IconCalendarEvent },
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

      <header className={`${glassHeader} ${isHomeAppearance ? "home-public-nav" : "marketplace-public-nav"}`}>
        {/* Mobile */}
        <nav aria-label="Primary mobile" className="flex px-3 py-3 md:hidden sm:px-4">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="LinkWe home">
              <LogoMark desktop={false} home={isHomeAppearance} />
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
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] [&_button]:rounded-[10px] [&_button]:border-0 [&_button]:bg-transparent [&_button]:shadow-none ${navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.1] text-white"}`}>
                    <NotificationBell initialUnreadCount={unreadCount} variant={navIsLight ? "light" : "dark"} compactToolbar />
                  </div>
                  <button
                    type="button"
                    onClick={toggleDrawerCart}
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${navIsLight ? "bg-zinc-100 text-[#1C1C1A]" : "bg-white/[0.1] text-white"}`}
                    aria-label="Cart"
                  >
                    <IconShoppingCart
                      key={cartBumpNonce}
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
        <nav aria-label="Primary desktop" className="hidden h-[68px] w-full min-w-0 items-center gap-4 overflow-visible px-6 md:flex xl:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="LinkWe home">
            <LogoMark desktop home={isHomeAppearance} />
          </Link>

          <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-visible px-2 lg:px-6">
            <div className={`w-full min-w-[180px] overflow-visible max-w-[600px]`}>
              <NavSearchInput variant="desktop" inputId="public-nav-desktop-search" light={navIsLight} />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link href={user ? dashTarget : "/register?role=vendor"} className="home-seller-link mr-3 hidden min-h-11 items-center text-xs font-semibold text-[#183e59] lg:inline-flex">{user ? "My workspace" : "Sell on LinkWe"}</Link>
            {!user && <>
              <Link href="/wishlist" aria-label="My wishlist" className={`flex size-10 items-center justify-center rounded-full ${isHomeAppearance ? "text-[#183e59] hover:bg-[#e5eff3]" : styles.utility}`}><IconHeart className="size-5" stroke={1.75} aria-hidden /></Link>
              <button type="button" aria-label="Open cart" onClick={toggleDrawerCart} className={`relative mr-2 flex size-10 items-center justify-center rounded-full ${isHomeAppearance ? "text-[#183e59] hover:bg-[#e5eff3]" : styles.utility}`}><IconShoppingCart key={cartBumpNonce} className="size-5" stroke={1.75} aria-hidden />{mounted && itemCount > 0 && <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-[#D4450A] text-[9px] text-white">{itemCount > 9 ? "9+" : itemCount}</span>}</button>
            </>}
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
                      key={cartBumpNonce}
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
      {!isHomeAppearance && <PublicBrowseBar />}

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
        className="fixed bottom-[max(.55rem,env(safe-area-inset-bottom,0px))] left-3 right-3 z-[100] overflow-hidden rounded-[24px] border border-white/90 bg-white/92 shadow-[0_18px_50px_rgba(28,28,26,0.24)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 gap-1 px-1.5">
          {mobileTabs.map((tab) => {
            const active =
              tab.label === "More"
                ? moreSheetOpen.value
                : tab.isActive(pathname, hash);
            const tabClass = `relative my-1.5 flex min-w-0 flex-col items-center justify-center gap-[3px] rounded-[18px] px-1 transition-all duration-300 ${active ? "bg-gradient-to-b from-orange-50 to-[#fff7f2] shadow-[inset_0_0_0_1px_rgba(212,69,10,0.08)]" : "hover:bg-zinc-50"}`;

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
                    key={tab.label === "Cart" ? cartBumpNonce : tab.label}
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
    { href: "/orders", label: "My Orders", Icon: IconPackage, authOnly: true },
    { href: "/wishlist", label: "My Wishlist", Icon: IconHeart, authOnly: true },
    { href: "/saved-stores", label: "Saved Stores", Icon: IconBookmark, authOnly: true },
    { href: "/timeline", label: "Timeline", Icon: IconNews, authOnly: true },
    { href: "/event-collections", label: "Event Collections", Icon: IconCalendarEvent, authOnly: true },
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
