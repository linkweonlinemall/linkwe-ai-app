"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CalendarDays,
  X,
  Trash2,
  Globe,
  EyeOff,
  MoreVertical,
  ScanLine,
  Users,
} from "lucide-react";
import {
  getVendorEventsForCurrentUser,
  deleteEvent,
  publishEvent,
  unpublishEvent,
  bulkUpdateEventStatus,
} from "@/app/actions/events";
import { icn } from "@/lib/iconography";

type EventItem = Awaited<ReturnType<typeof getVendorEventsForCurrentUser>>[number];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Draft", bg: "#F4F4F5", color: "var(--text-muted)" },
  PUBLISHED: { label: "Published", bg: "#DCFCE7", color: "#15803D" },
  CANCELLED: { label: "Cancelled", bg: "#FEE2E2", color: "#DC2626" },
  COMPLETED: { label: "Completed", bg: "#FEF3C7", color: "#D97706" },
};

function formatEventDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const EVENT_MENU_WIDTH = 224;
const EVENT_MENU_GAP = 4;
const EVENT_MENU_VIEWPORT_PAD = 8;
const EVENT_MENU_ESTIMATED_HEIGHT = 280;

function computeEventMenuPosition(
  button: HTMLElement,
  menuHeight: number,
): { top: number; left: number } {
  const rect = button.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right - EVENT_MENU_WIDTH;
  let top = rect.bottom + EVENT_MENU_GAP;

  if (left < EVENT_MENU_VIEWPORT_PAD) {
    left = rect.left;
  }
  if (left + EVENT_MENU_WIDTH > vw - EVENT_MENU_VIEWPORT_PAD) {
    left = vw - EVENT_MENU_WIDTH - EVENT_MENU_VIEWPORT_PAD;
  }
  if (left < EVENT_MENU_VIEWPORT_PAD) {
    left = EVENT_MENU_VIEWPORT_PAD;
  }

  if (top + menuHeight > vh - EVENT_MENU_VIEWPORT_PAD) {
    top = rect.top - menuHeight - EVENT_MENU_GAP;
  }
  if (top < EVENT_MENU_VIEWPORT_PAD) {
    top = EVENT_MENU_VIEWPORT_PAD;
  }

  return { top, left };
}

function EventRowActionsMenu({
  event,
  isPending,
  open,
  onOpenChange,
  onPublishToggle,
  onDelete,
}: {
  event: EventItem;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishToggle: (event: EventItem) => void;
  onDelete: (eventId: string, title: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button || !open) return;
    const menuHeight = menuRef.current?.offsetHeight ?? EVENT_MENU_ESTIMATED_HEIGHT;
    setMenuPosition(computeEventMenuPosition(button, menuHeight));
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    function handleScrollOrResize() {
      updateMenuPosition();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [open, onOpenChange, updateMenuPosition]);

  const menuItemClass =
    "flex min-h-[44px] w-full items-center gap-2.5 px-4 text-sm font-medium text-[#1C1C1A] transition-colors hover:bg-[#F7F7F6]";

  const menuPanel = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: menuPosition?.top ?? 0,
        left: menuPosition?.left ?? 0,
        width: EVENT_MENU_WIDTH,
        visibility: menuPosition ? "visible" : "hidden",
      }}
      className="z-[200] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
    >
      <Link
        role="menuitem"
        href={`/dashboard/vendor/events/${event.id}/tickets`}
        onClick={() => onOpenChange(false)}
        className={menuItemClass}
      >
        Tickets
      </Link>
      <Link
        role="menuitem"
        href={`/dashboard/vendor/events/${event.id}/attendees`}
        onClick={() => onOpenChange(false)}
        className={menuItemClass}
      >
        <Users className="h-4 w-4 shrink-0" aria-hidden />
        Attendees
      </Link>
      <Link
        role="menuitem"
        href={`/dashboard/vendor/events/${event.id}/checkin`}
        onClick={() => onOpenChange(false)}
        className={`${menuItemClass} text-[#D4450A] hover:bg-[#FEF0EB]`}
      >
        <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
        Check in
      </Link>
      <Link
        role="menuitem"
        href={`/dashboard/vendor/events/${event.id}/edit`}
        onClick={() => onOpenChange(false)}
        className={menuItemClass}
      >
        Edit
      </Link>
      <button
        type="button"
        role="menuitem"
        disabled={isPending}
        onClick={() => {
          onOpenChange(false);
          onPublishToggle(event);
        }}
        className={`${menuItemClass} disabled:opacity-40 ${
          event.status === "PUBLISHED" ? "text-zinc-600" : "text-[#15803D]"
        }`}
      >
        {event.status === "PUBLISHED" ? (
          <>
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
            Unpublish
          </>
        ) : (
          <>
            <Globe className="h-4 w-4 shrink-0" aria-hidden />
            Publish
          </>
        )}
      </button>
      <div className="mx-3 my-1 h-px bg-zinc-100" aria-hidden />
      <button
        type="button"
        role="menuitem"
        disabled={isPending}
        onClick={() => {
          onOpenChange(false);
          onDelete(event.id, event.title);
        }}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
        Delete
      </button>
    </div>
  ) : null;

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        aria-label={`Actions for ${event.title}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-5 w-5 shrink-0" aria-hidden />
      </button>

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}

export default function VendorEventsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    const data = await getVendorEventsForCurrentUser();
    setEvents(data);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    void load().catch(() => setLoadError(true));
  }, [load]);

  // ── single-row actions ──────────────────────────────────────────────────────

  function handleDelete(eventId: string, title: string) {
    if (!confirm(`Cancel/delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      setActionError(null);
      const result = await deleteEvent(eventId);
      if ("error" in result) setActionError(result.error);
      else await load();
    });
  }

  function handlePublishToggle(event: EventItem) {
    startTransition(async () => {
      setActionError(null);
      const result =
        event.status === "PUBLISHED"
          ? await unpublishEvent(event.id)
          : await publishEvent(event.id);
      if ("error" in result) setActionError(result.error);
      else await load();
    });
  }

  // ── checkbox helpers ────────────────────────────────────────────────────────

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const all = events ?? [];
    if (selectedIds.size === all.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(all.map((e) => e.id)));
    }
  }

  // ── bulk actions ────────────────────────────────────────────────────────────

  function handleBulk(action: "publish" | "unpublish" | "delete") {
    if (action === "delete") {
      if (
        !confirm(
          `Delete / cancel ${selectedIds.size} event${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`,
        )
      )
        return;
    }
    startTransition(async () => {
      setActionError(null);
      const result = await bulkUpdateEventStatus([...selectedIds], action);
      if ("error" in result) {
        setActionError(result.error);
      } else {
        if (result.errors.length > 0) {
          setActionError(`${result.count} updated. ${result.errors.length} failed.`);
        }
        await load();
      }
    });
  }

  // ── render states ───────────────────────────────────────────────────────────

  if (events === null && !loadError) {
    return (
      <div className="px-6 py-8">
        <div className="mb-6 flex animate-pulse items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-28 rounded-lg bg-zinc-200" />
            <div className="h-4 w-48 rounded-lg bg-zinc-100" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-zinc-200" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Couldn&apos;t load events. Please refresh the page.
        </p>
      </div>
    );
  }

  const all = events ?? [];
  const allSelected = all.length > 0 && selectedIds.size === all.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="px-6 py-8">
      <Link
        href="/dashboard/vendor"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Events
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Manage your events and ticket sales
          </p>
        </div>
        <Link
          href="/dashboard/vendor/events/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--scarlet)" }}
        >
          + Create event
        </Link>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* ── Bulk action bar ── slides in when selections exist */}
      {someSelected && (
        <div
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
          style={{
            backgroundColor: "#1C1C1A",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-sm font-medium text-white">
            {selectedIds.size} event{selectedIds.size > 1 ? "s" : ""} selected
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBulk("publish")}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              <Globe className="size-3.5" />
              Publish
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBulk("unpublish")}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
            >
              <EyeOff className="size-3.5" />
              Unpublish
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleBulk("delete")}
              className="flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3.5 py-2 text-xs font-semibold text-red-400 transition-colors hover:border-red-400 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70"
          >
            <X className="size-3.5" />
            Deselect all
          </button>
        </div>
      )}

      <div
        className="overflow-hidden rounded-xl bg-white"
        style={{ border: "1px solid var(--card-border)" }}
      >
        {all.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays
              className={`${icn.empty} mx-auto mb-3`}
              aria-hidden
              strokeWidth={1.25}
            />
            <p className="mb-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              No events yet
            </p>
            <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
              Create your first event to start selling tickets
            </p>
            <Link
              href="/dashboard/vendor/events/new"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              + Create event
            </Link>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div
              className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide"
              style={{
                color: "var(--text-muted)",
                backgroundColor: "#F7F7F6",
                borderBottom: "1px solid var(--card-border-subtle)",
              }}
            >
              {/* Select-all checkbox */}
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-[#D4450A]"
                  aria-label="Select all events"
                />
              </div>
              <div className="col-span-4">Event</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Tickets</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {all.map((event) => {
              const badge = STATUS_BADGE[event.status] ?? STATUS_BADGE.DRAFT!;
              const totalQty = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
              const totalSold = event.ticketTypes.reduce((s, t) => s + t.quantitySold, 0);
              const checked = selectedIds.has(event.id);

              return (
                <div
                  key={event.id}
                  className={`px-4 py-4 transition-colors md:grid md:grid-cols-12 md:items-center md:gap-4 md:px-5 ${
                    checked ? "bg-orange-50/60" : "hover:bg-zinc-50/60"
                  }`}
                  style={{ borderBottom: "1px solid var(--card-border-subtle)" }}
                >
                  <div className="flex w-full items-center gap-2.5 md:contents">
                    {/* Checkbox + thumbnail */}
                    <div className="flex shrink-0 items-center gap-2.5 md:col-span-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(event.id)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-[#D4450A]"
                        aria-label={`Select ${event.title}`}
                      />
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                        {event.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.coverImage}
                            alt={event.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center text-xs font-bold"
                            style={{ color: "var(--text-disabled)" }}
                          >
                            {event.title.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title + category */}
                    <div className="min-w-0 flex-1 md:col-span-4">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {event.title}
                      </p>
                      <span className="mt-0.5 block text-xs capitalize text-zinc-400">
                        {event.category?.replace(/_/g, " ")}
                        {event.isOnline
                          ? " · Online"
                          : event.region
                            ? ` · ${event.region}`
                            : ""}
                      </span>
                      <p className="mt-1 text-xs text-zinc-500 md:hidden">
                        {formatEventDate(event.startDate)}
                        <span className="text-zinc-300"> · </span>
                        {totalSold} / {totalQty || "—"} sold
                      </p>
                    </div>

                    {/* Date */}
                    <div className="hidden md:block md:col-span-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {formatEventDate(event.startDate)}
                      </span>
                    </div>

                    {/* Tickets sold */}
                    <div className="hidden md:block md:col-span-2">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {totalSold} / {totalQty || "—"}
                      </span>
                      <span className="ml-1 text-xs text-zinc-400">
                        ({event.ticketTypes.length} type
                        {event.ticketTypes.length !== 1 ? "s" : ""})
                      </span>
                    </div>

                    {/* Status badge — desktop column */}
                    <div className="hidden md:flex md:col-span-1 md:items-center">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Status (mobile) + actions menu */}
                    <div className="flex shrink-0 items-center gap-2 md:col-span-2 md:justify-end">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium md:hidden"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <EventRowActionsMenu
                        event={event}
                        isPending={isPending}
                        open={openMenuEventId === event.id}
                        onOpenChange={(next) => setOpenMenuEventId(next ? event.id : null)}
                        onPublishToggle={handlePublishToggle}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
