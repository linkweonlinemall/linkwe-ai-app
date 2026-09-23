"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Store,
  Package,
  Sparkles,
  Users,
  Layers,
  Search,
  Plus,
  FileUp,
  UserRoundPlus,
  SlidersHorizontal,
} from "lucide-react";
import {
  searchAdminRecords,
  type AdminSearchResult,
} from "@/app/actions/admin-search";
import OnboardingStudio from "./onboarding-studio";
import BulkUserActions from "./bulk-user-actions";
import AdminPageHeader from "../components/admin-page-header";
import type { RecordKind } from "@/lib/admin/record-fields";
const choices = [
  {
    kind: "store",
    label: "Storefront",
    detail: "Brand, gallery, opening hours, location and customer experience.",
    icon: Store,
    tint: "#e8f3ed",
    colour: "#3d7762",
  },
  {
    kind: "product",
    label: "Product",
    detail:
      "Photos, prices, stock, variations, delivery and digital downloads.",
    icon: Package,
    tint: "#fff0e5",
    colour: "#b74d1d",
  },
  {
    kind: "service",
    label: "Service",
    detail: "Appointments, quotes, subscriptions and on-demand services.",
    icon: Sparkles,
    tint: "#e9eefb",
    colour: "#5872b3",
  },
  {
    kind: "user",
    label: "Person or staff account",
    detail:
      "Contact details, customer or vendor access, and administrator accounts.",
    icon: Users,
    tint: "#f3ebfa",
    colour: "#8563a1",
  },
  {
    kind: "listing",
    label: "Other listing",
    detail:
      "Property, vehicles, events, places and other marketplace listings.",
    icon: Layers,
    tint: "#f7f1dc",
    colour: "#8a7734",
  },
];
export default function CreationLauncher({
  users,
}: {
  users: { id: string; fullName: string; email: string; role: string }[];
}) {
  const [tab, setTab] = useState("create");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<RecordKind | "">("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (tab !== "find" || query.trim().length < 2) return;
    let current = true;
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const rows = await searchAdminRecords(query, kind || undefined);
        if (current) setResults(rows);
      } catch {
        if (current) setError("Could not load results. Try the search again.");
      } finally {
        if (current) setBusy(false);
      }
    }, 250);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, kind, tab]);
  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Build something local"
        title="Creation Studio"
        description="A clear starting point for every new business, person and offering. Create a complete record or jump straight into an existing one."
      />
      <nav className="admin-tabs" aria-label="Creation Studio tools">
        {[
          { id: "create", label: "Create something", icon: Plus },
          { id: "find", label: "Find & edit", icon: Search },
          { id: "vendor", label: "Set up a vendor", icon: UserRoundPlus },
          { id: "import", label: "Import vendors", icon: FileUp },
        ].map((item) => (
          <button
            type="button"
            aria-current={tab === item.id ? "page" : undefined}
            key={item.id}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "create" && (
        <>
          <div className="admin-creation-grid">
            {choices.map((choice) => (
              <Link
                href={`/dashboard/admin/records/${choice.kind}/new`}
                className="admin-create-card"
                key={choice.kind}
              >
                <span style={{ background: choice.tint, color: choice.colour }}>
                  <choice.icon size={25} />
                </span>
                <h2>{choice.label}</h2>
                <p>{choice.detail}</p>
                <small>
                  Create {choice.kind}
                  <ArrowUpRight size={15} />
                </small>
              </Link>
            ))}
            <button
              type="button"
              className="admin-create-card text-left"
              style={{
                background: "#1e4346",
                borderColor: "#1e4346",
                color: "white",
              }}
              onClick={() => setTab("vendor")}
            >
              <span style={{ background: "#ffffff15", color: "#f8b58e" }}>
                <UserRoundPlus size={25} />
              </span>
              <h2>A whole new business</h2>
              <p style={{ color: "#b5cdcb" }}>
                Create the owner&apos;s account, their store and an optional
                first offering in one guided setup.
              </p>
              <small style={{ color: "#f8bc99" }}>
                Start vendor setup
                <ArrowUpRight size={15} />
              </small>
            </button>
          </div>
          <div className="admin-panel mt-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="admin-panel-title">Already on LinkWe?</h2>
              <p className="admin-muted mt-2">
                Find any existing record by name, email, store or URL name.
              </p>
            </div>
            <button className="admin-button" onClick={() => setTab("find")}>
              <Search size={16} />
              Find & edit a record
            </button>
          </div>
        </>
      )}
      {tab === "find" && (
        <section className="admin-panel">
          <h2 className="admin-panel-title">Find the right record</h2>
          <p className="admin-muted mt-2 mb-5">
            Search includes older records, drafts, archived items and inactive
            accounts.
          </p>
          <div className="admin-filterbar">
            <input
              className="admin-input"
              autoFocus
              placeholder="Search name, email, store or URL name…"
              aria-label="Find a record"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setResults([]);
                setBusy(e.target.value.trim().length >= 2);
              }}
            />
            <select
              className="admin-input"
              aria-label="Record type"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as RecordKind | "");
                setResults([]);
              }}
            >
              <option value="">All record types</option>
              {choices.map((choice) => (
                <option key={choice.kind} value={choice.kind}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
          <div aria-live="polite">
            {query.trim().length < 2 ? (
              <div className="admin-empty">
                Start with at least two letters.
              </div>
            ) : busy ? (
              <div className="admin-empty">Finding matching records…</div>
            ) : error ? (
              <p className="admin-alert">{error}</p>
            ) : results.length ? (
              <>
                <p className="admin-muted mb-3">
                  {results.length} matching records shown. Add more detail to
                  narrow your search.
                </p>
                {results.map((record) => (
                  <Link
                    className="admin-command-result border-b border-zinc-100"
                    key={record.id}
                    href={record.href}
                  >
                    <span>
                      <strong>{record.label}</strong>
                      <small>{record.description}</small>
                    </span>
                    <ArrowUpRight size={16} className="ml-auto" />
                  </Link>
                ))}
              </>
            ) : (
              <div className="admin-empty">
                No records match. Try a different name or email.
              </div>
            )}
          </div>
        </section>
      )}
      {tab === "vendor" && <OnboardingStudio mode="single" />}
      {tab === "import" && <OnboardingStudio mode="csv" />}
      <details className="mt-8">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 text-xs text-[#74878c]">
          <SlidersHorizontal size={15} />
          Advanced account operations
        </summary>
        <div className="mt-3">
          <BulkUserActions users={users} />
        </div>
      </details>
    </div>
  );
}
