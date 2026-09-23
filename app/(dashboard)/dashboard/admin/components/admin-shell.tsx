"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  Plus,
  Menu,
  LogOut,
  Settings,
  LayoutDashboard,
  ShoppingBag,
  Store,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/auth-actions";
import NotificationBell from "@/components/ui/NotificationBell";
import {
  ADMIN_NAV,
  ADMIN_LINKS,
  adminItemActive,
} from "@/lib/admin/navigation";
import {
  searchAdminRecords,
  type AdminSearchResult,
} from "@/app/actions/admin-search";
import AdminDialog from "./admin-dialog";
import "./admin-workspace.css";

type Counts = Record<"verification" | "payouts" | "orders", number>;
export default function AdminShell({
  adminName,
  unreadCount,
  attentionCounts,
  children,
}: {
  adminName: string;
  unreadCount: number;
  attentionCounts: Counts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeTab = params.get("tab") || "overview";
  const queryString = params.toString();
  useEffect(() => {
    document
      .getElementById("admin-main")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, queryString]);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<AdminSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!search || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const found = await searchAdminRecords(query);
        if (!cancelled) setRecords(found);
      } catch {
        if (!cancelled)
          setSearchError(
            "Search could not load. Try again or open a workspace below.",
          );
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search]);
  function closeSearch() {
    setSearch(false);
    setQuery("");
    setRecords([]);
  }
  const navigation = (
    <nav aria-label="All admin workspaces">
      {ADMIN_NAV.map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <p className="admin-nav-label">{group.label}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawer(false)}
              aria-current={
                adminItemActive(
                  { ...item, group: group.label },
                  pathname,
                  activeTab,
                )
                  ? "page"
                  : undefined
              }
              className="admin-nav-link"
            >
              <item.icon />
              <span>{item.label}</span>
              {"badge" in item && attentionCounts[item.badge] > 0 && (
                <span className="admin-count">
                  {Math.min(attentionCounts[item.badge], 99)}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
  const tools = ADMIN_LINKS.filter((item) =>
    `${item.label} ${item.group}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <div className="admin-workspace">
      <a className="admin-skip" href="#admin-main">
        Skip to workspace
      </a>
      <header className="admin-topbar">
        <button
          className="admin-icon-button admin-mobile-menu"
          onClick={() => setDrawer(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <Link className="admin-brand" href="/dashboard/admin">
          <Image
            src="/linkwe-logo-mark-on-light.png"
            alt=""
            width={45}
            height={45}
          />
          <div>
            <strong>
              LinkWe<span style={{ color: "#d44913" }}>.</span>
            </strong>
            <small>MANAGEMENT SUITE</small>
          </div>
        </Link>
        <button
          className="admin-top-search"
          onClick={() => setSearch(true)}
          aria-label="Search records and workspaces"
        >
          <Search size={18} />
          <span>Search stores, people, products…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="admin-top-actions">
          <Link
            href="/"
            target="_blank"
            className="admin-icon-button admin-top-visit"
            aria-label="Open marketplace in a new tab"
          >
            <ArrowUpRight size={19} />
          </Link>
          <Link
            href="/dashboard/admin/onboarding"
            className="admin-button admin-button-primary admin-top-create"
          >
            <Plus size={17} />
            Create
          </Link>
          <NotificationBell compactToolbar initialUnreadCount={unreadCount} />
          <details className="admin-account">
            <summary aria-label="Account menu">
              <span className="admin-avatar">
                {adminName.charAt(0).toUpperCase()}
              </span>
            </summary>
            <div className="admin-account-panel">
              <p className="px-3 py-2 text-xs font-semibold">
                {adminName}
                <span className="mt-1 block text-[10px] font-normal text-zinc-500">
                  Administrator
                </span>
              </p>
              <Link href="/dashboard/admin/settings">
                <Settings size={16} />
                Account & settings
              </Link>
              <form action={logoutAction}>
                <button>
                  <LogOut size={16} />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <aside className="admin-sidebar">
        <div className="admin-side-intro">
          <strong>Good work starts here.</strong>
          <p>
            Your people. Your marketplace.
            <br />
            Everything in one place.
          </p>
        </div>
        {navigation}
        <Link href="/dashboard/admin/guide" className="admin-sidebar-footer">
          A little guidance?
          <ArrowUpRight size={15} />
        </Link>
      </aside>
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        <div className="admin-content">{children}</div>
      </main>
      <nav className="admin-mobilebar" aria-label="Quick navigation">
        <Link
          href="/dashboard/admin"
          aria-current={
            pathname === "/dashboard/admin" && activeTab === "overview"
              ? "page"
              : undefined
          }
        >
          <LayoutDashboard size={20} />
          Overview
        </Link>
        <Link
          href="/dashboard/admin?tab=orders"
          aria-current={
            pathname === "/dashboard/admin" && activeTab === "orders"
              ? "page"
              : undefined
          }
        >
          <ShoppingBag size={20} />
          Orders
        </Link>
        <Link
          href="/dashboard/admin/onboarding"
          className="admin-mobile-create"
          aria-label="Create a record"
        >
          <Plus />
          Create
        </Link>
        <Link
          href="/dashboard/admin/stores"
          aria-current={pathname.includes("/stores") ? "page" : undefined}
        >
          <Store size={20} />
          Stores
        </Link>
        <button onClick={() => setDrawer(true)}>
          <MoreHorizontal size={20} />
          All tools
        </button>
      </nav>
      {drawer && (
        <AdminDialog
          drawer
          title="Your workspace"
          onClose={() => setDrawer(false)}
        >
          {navigation}
        </AdminDialog>
      )}
      {search && (
        <AdminDialog title="Find anything" onClose={closeSearch}>
          <label className="sr-only" htmlFor="admin-record-search">
            Search records and workspaces
          </label>
          <input
            id="admin-record-search"
            data-initial-focus
            autoFocus
            className="admin-input"
            placeholder="A store, person, item or workspace…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setRecords([]);
              setSearchError("");
              setSearching(event.target.value.trim().length >= 2);
            }}
          />
          <div className="admin-command-results" aria-live="polite">
            {query.trim().length >= 2 && (
              <>
                <h3>Marketplace records</h3>
                {searching ? (
                  <p className="admin-muted p-3">Searching…</p>
                ) : searchError ? (
                  <p role="alert" className="admin-muted p-3">
                    {searchError}
                  </p>
                ) : records.length ? (
                  records.map((record) => (
                    <Link
                      onClick={closeSearch}
                      key={`${record.kind}-${record.id}`}
                      href={record.href}
                      className="admin-command-result"
                    >
                      <Search size={17} />
                      <span>
                        {record.label}
                        <small>{record.description}</small>
                      </span>
                      <ChevronRight size={14} className="ml-auto" />
                    </Link>
                  ))
                ) : (
                  <p className="admin-muted p-3">
                    No matching records. Try a name, email or URL name.
                  </p>
                )}
              </>
            )}
            <h3>Workspaces</h3>
            {tools.map((item) => (
              <Link
                key={item.href}
                onClick={closeSearch}
                href={item.href}
                className="admin-command-result"
              >
                <item.icon size={19} />
                <span>
                  {item.label}
                  <small>{item.group}</small>
                </span>
                <ChevronRight size={14} className="ml-auto" />
              </Link>
            ))}
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
