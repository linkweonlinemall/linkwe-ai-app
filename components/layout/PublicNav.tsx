"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  IconHeart,
  IconHome,
  IconMenu2,
  IconNews,
  IconSearch,
  IconShoppingBag,
  IconShoppingCart,
} from "@tabler/icons-react";

import PublicBrowseBar from "./PublicBrowseBar";
import PublicMenuDrawer from "./PublicMenuDrawer";
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
  const moreSheetOpen = drawerOpen;
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
      label: "Menu",
      Icon: IconMenu2,
      action: "more",
      isActive: () => false,
    },
  ];




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
                <><button type="button" aria-label="Open LinkWe menu" aria-haspopup="dialog" aria-expanded={drawerOpen.value} onClick={drawerOpen.toggle} className={`flex h-9 w-9 items-center justify-center rounded-full ${navIsLight ? "bg-zinc-100 text-[#193c3b]" : "bg-white/10 text-white"}`}><IconMenu2 size={19}/></button><Link
                  href={loginHref}
                  className="flex h-8 shrink-0 items-center justify-center rounded-lg px-3.5 text-[12px] font-bold leading-none text-white"
                  style={{ backgroundColor: SCARLET }}
                >
                  Sign in
                </Link></>
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
              <><button type="button" aria-label="Open LinkWe menu" aria-haspopup="dialog" aria-expanded={drawerOpen.value} onClick={drawerOpen.toggle} className={`flex h-9 w-9 items-center justify-center rounded-full ${navIsLight ? "bg-zinc-100 text-[#193c3b]" : "bg-white/10 text-white"}`}><IconMenu2 size={19}/></button><Link href={loginHref} className="flex h-9 shrink-0 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold text-white" style={{ backgroundColor: SCARLET }}>
                Sign in
              </Link></>
            ) : null}
          </div>
        </nav>
      </header>
      {!isHomeAppearance && <PublicBrowseBar />}

      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
      />

      <PublicMenuDrawer
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
        className={styles.bottomNav}
      >
        <div className={styles.bottomInner}>
          {mobileTabs.map((tab) => {
            const active =
              tab.label === "Menu"
                ? moreSheetOpen.value
                : tab.isActive(pathname, hash);
            const tabClass = `${styles.bottomItem} ${active ? styles.bottomActive : ""}`;

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
                    } ${active ? "text-[#193c3b]" : "text-[var(--color-text-secondary)]"}`}
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
                  aria-label="Open LinkWe menu"
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

function useDrawerOpenControlled() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(value => !value), []);
  return { value: open, close, toggle };
}
