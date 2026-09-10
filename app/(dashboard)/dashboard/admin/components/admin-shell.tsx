"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logoutAction } from "@/app/(auth)/auth-actions";
import NotificationBell from "@/components/ui/NotificationBell";

// ─── Nav definition ────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  /** ?tab= value if this item activates a tab inside /dashboard/admin */
  tab?: string;
  icon: React.ReactNode;
  badgeKey?: "verification" | "payouts" | "orders";
};

type NavGroup = { label: string; items: NavItem[] };

function icon(d: string) {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Command centre",  href: "/dashboard/admin?tab=overview",  tab: "overview",  icon: icon("M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z") },
      { label: "Verification", href: "/dashboard/admin/verification", badgeKey: "verification", icon: icon("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4") },
      { label: "Orders",    href: "/dashboard/admin?tab=orders",    tab: "orders", badgeKey: "orders", icon: icon("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8") },
      { label: "Warehouse & CSF", href: "/dashboard/admin?tab=linkwe-delivery", tab: "linkwe-delivery", icon: icon("M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z") },
      { label: "Finance", href: "/dashboard/admin?tab=payouts", tab: "payouts", badgeKey: "payouts", icon: icon("M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6") },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Services", href: "/dashboard/admin/services", icon: icon("M12 3v18M3 12h18M5 5l14 14M5 19L19 5") },
      { label: "Products", href: "/dashboard/admin/products", icon: icon("M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0") },
      { label: "Stores",   href: "/dashboard/admin/stores",   icon: icon("M3 21h18M5 21V8l9-6 9 6v13M9 21v-6h6v6") },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Creation Studio", href: "/dashboard/admin/onboarding", icon: icon("M12 5v14M5 12h14M3 3h18v18H3z") },
      { label: "Messages",     href: "/dashboard/admin/messages",      icon: icon("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z") },
      { label: "People & access",        href: "/dashboard/admin/users",         icon: icon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z") },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Test Lab", href: "/dashboard/admin/test-lab", icon: icon("M9 3v5l-4.5 8a3 3 0 0 0 2.6 4.5h9.8a3 3 0 0 0 2.6-4.5L15 8V3M8 3h8M7 15h10") },
      { label: "Admin guide", href: "/dashboard/admin/guide", icon: icon("M4 4h16v16H4zM8 8h8M8 12h8M8 16h5") },
      { label: "Settings", href: "/dashboard/admin/settings", icon: icon("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z") },
    ],
  },
];

// ─── Active detection ──────────────────────────────────────────────────────────

function isItemActive(item: NavItem, pathname: string, activeTab: string): boolean {
  if (!item.tab) return pathname.startsWith(item.href);
  if (pathname !== "/dashboard/admin") return false;
  return activeTab === item.tab;
}

// ─── Shared nav link list (used in both sidebar and mobile drawer) ─────────────

function SidebarNavLinks({
  pathname,
  activeTab,
  onLinkClick,
  attentionCounts,
}: {
  pathname: string;
  activeTab: string;
  onLinkClick?: () => void;
  attentionCounts: Record<"verification" | "payouts" | "orders", number>;
}) {
  return (
    <nav className="flex flex-col gap-0.5 p-3 pt-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isItemActive(item, pathname, activeTab);
            return (
              <Link
                key={item.href + (item.tab ?? "")}
                href={item.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#D4450A]/8 text-[#D4450A]"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className={active ? "text-[#D4450A]" : "text-zinc-400"}>
                  {item.icon}
                </span>
                {item.label}
                {item.badgeKey && attentionCounts[item.badgeKey] > 0 ? <span className="ml-auto min-w-5 rounded-full bg-[#D4450A] px-1.5 text-center text-[9px] font-black leading-5 text-white shadow-sm">{attentionCounts[item.badgeKey] > 99 ? "99+" : attentionCounts[item.badgeKey]}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function MobileOperationsBar({
  pathname,
  activeTab,
  attentionCounts,
  openDrawer,
}: {
  pathname: string;
  activeTab: string;
  attentionCounts: Record<"verification" | "payouts" | "orders", number>;
  openDrawer: () => void;
}) {
  const items = [
    NAV_GROUPS[0]!.items[0]!,
    NAV_GROUPS[0]!.items[2]!,
    NAV_GROUPS[0]!.items[1]!,
    NAV_GROUPS[0]!.items[4]!,
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(28,28,26,0.08)] backdrop-blur md:hidden" aria-label="Primary admin operations">
      {items.map((item) => {
        const active = isItemActive(item, pathname, activeTab);
        const count = item.badgeKey ? attentionCounts[item.badgeKey] : 0;
        return (
          <Link key={item.href + (item.tab ?? "")} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[9px] font-bold ${active ? "text-[#D4450A]" : "text-zinc-500"}`}>
            <span className="relative [&_svg]:h-[18px] [&_svg]:w-[18px]">
              {item.icon}
              {count > 0 ? <span className="absolute -right-2.5 -top-2 min-w-4 rounded-full bg-[#D4450A] px-1 text-center text-[8px] leading-4 text-white">{count > 9 ? "9+" : count}</span> : null}
            </span>
            {item.label === "Verification" ? "Verify" : item.label === "Command centre" ? "Home" : item.label}
          </Link>
        );
      })}
      <button type="button" onClick={openDrawer} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[9px] font-bold text-zinc-500" aria-label="Open all admin tools">
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
        More
      </button>
    </nav>
  );
}

// ─── Account dropdown ──────────────────────────────────────────────────────────

function AccountMenu({ adminName }: { adminName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white sm:px-3"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D4450A] text-xs font-bold text-white">
          {adminName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block max-w-[120px] truncate">{adminName}</span>
        <svg className="h-3 w-3 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg z-50">
          <Link
            href="/dashboard/admin/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Account & password
          </Link>
          <div className="mx-3 h-px bg-zinc-100" />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Shell ─────────────────────────────────────────────────────────────────────

type Props = {
  adminName: string;
  unreadCount: number;
  attentionCounts: Record<"verification" | "payouts" | "orders", number>;
  children: React.ReactNode;
};

export default function AdminShell({ adminName, unreadCount, attentionCounts, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  // ── Mobile drawer state ────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ESC to close
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    function onCommandKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", onCommandKey);
    return () => window.removeEventListener("keydown", onCommandKey);
  }, []);

  // Lock body scroll while navigation or command search is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen || commandOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, commandOpen]);

  const commandItems = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label })),
  ).filter((item) =>
    `${item.label} ${item.group}`.toLowerCase().includes(commandQuery.trim().toLowerCase()),
  );

  function runCommand(href: string) {
    setCommandOpen(false);
    setCommandQuery("");
    router.push(href);
  }

  return (
    <div className="h-full bg-[#F5F5F5]" style={{ fontFamily: "var(--font-sora, sans-serif)" }}>

      {/* ── Top header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between px-4 md:px-5"
        style={{ backgroundColor: "#1C1C1A" }}
      >
        {/* Left: hamburger (mobile only) + logo + pill */}
        <div className="flex items-center gap-2">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-label="Open navigation"
            onClick={openDrawer}
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 md:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="3" y1="6"  x2="21" y2="6"  />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/dashboard/admin" className="flex items-center">
            <img
              src="/linkwe-logo-mobile-on-light.png"
              alt="LinkWe"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <span className="rounded-md bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            Operations
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="absolute left-1/2 hidden h-9 w-[min(34rem,38vw)] -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-left text-xs text-white/45 transition hover:bg-white/10 hover:text-white/70 lg:flex"
          aria-label="Search admin tools"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span>Search operations and controls</span>
          <kbd className="ml-auto rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/35">⌘ K</kbd>
        </button>

        {/* Right: bell + account menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NotificationBell compactToolbar initialUnreadCount={unreadCount} variant="dark" />

          <AccountMenu adminName={adminName} />
        </div>
      </header>

      {commandOpen ? (
        <div className="fixed inset-0 z-[1400] flex items-start justify-center bg-black/60 px-3 pt-[10vh] backdrop-blur-sm" role="presentation" onMouseDown={() => setCommandOpen(false)}>
          <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Search admin tools" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4">
              <svg className="h-5 w-5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Find orders, verification, users, payouts…"
                className="h-14 min-w-0 flex-1 border-0 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400"
              />
              <button type="button" onClick={() => setCommandOpen(false)} className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-400">ESC</button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {commandItems.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-zinc-400">No admin tool matches that search.</p>
              ) : commandItems.map((item) => (
                <button key={item.href + (item.tab ?? "")} type="button" onClick={() => runCommand(item.href)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-zinc-100">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">{item.icon}</span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">{item.label}</span>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-zinc-400">{item.group}</span>
                  </span>
                  {item.badgeKey && attentionCounts[item.badgeKey] > 0 ? <span className="ml-auto rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">{attentionCounts[item.badgeKey]}</span> : null}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {/* ── Mobile drawer backdrop ── */}
      <div
        role="presentation"
        aria-hidden={!drawerOpen}
        className={`fixed inset-0 z-[1100] bg-black/60 transition-opacity duration-200 md:hidden ${
          drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
      />

      {/* ── Mobile slide-out drawer ── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        className={`fixed left-0 top-0 z-[1200] flex h-full w-[min(280px,85vw)] flex-col bg-white shadow-2xl transition-transform duration-200 ease-out md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header — dark, matches the top bar */}
        <div
          className="flex h-14 shrink-0 items-center justify-between px-4"
          style={{ backgroundColor: "#1C1C1A" }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin"
              onClick={closeDrawer}
              className="text-lg font-bold text-white tracking-tight"
            >
              LinkWe
            </Link>
            <span className="rounded-md bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Operations
            </span>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6"  x2="6"  y2="18" />
              <line x1="6"  y1="6"  x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable nav links */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNavLinks
            pathname={pathname}
            activeTab={activeTab}
            onLinkClick={closeDrawer}
            attentionCounts={attentionCounts}
          />
        </div>
      </aside>

      {/* ── Below header ── */}
      <div className="flex h-full overflow-hidden pt-14">

        {/* ── Desktop sidebar — hidden on mobile ── */}
        <aside
          className="fixed left-0 top-14 bottom-0 z-20 hidden w-[220px] flex-col overflow-y-auto bg-white md:flex"
          style={{ borderRight: "1px solid rgba(28,28,26,0.08)" }}
        >
          <SidebarNavLinks pathname={pathname} activeTab={activeTab} attentionCounts={attentionCounts} />
        </aside>

        {/* ── Main content — full-width on mobile, offset on desktop ── */}
        <main className="flex-1 overflow-y-auto pb-20 md:ml-[220px] md:pb-0">
          {children}
        </main>
      </div>

      <MobileOperationsBar pathname={pathname} activeTab={activeTab} attentionCounts={attentionCounts} openDrawer={openDrawer} />
    </div>
  );
}
