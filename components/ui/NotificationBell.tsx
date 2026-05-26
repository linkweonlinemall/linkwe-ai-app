"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  Package,
  ShoppingBag,
  Star,
  XCircle,
  Zap,
} from "lucide-react";

import { NotificationRowSkeleton } from "@/components/ui/content-skeletons";
import { icn } from "@/lib/iconography";

function notificationRowIconClass(type: string): string {
  if (
    type === "ON_DEMAND_REQUEST_ACCEPTED" ||
    type === "ON_DEMAND_REQUEST_COMPLETED"
  ) {
    return icn.success;
  }
  if (type === "BOOKING_CANCELLED" || type === "ON_DEMAND_REQUEST_DECLINED") {
    return icn.danger;
  }
  return icn.inline;
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date | string;
};

const TYPE_ICON: Record<string, LucideIcon> = {
  ORDER_PLACED: ShoppingBag,
  ORDER_STATUS_UPDATED: Package,
  BOOKING_CONFIRMED: Calendar,
  BOOKING_CANCELLED: XCircle,
  ON_DEMAND_REQUEST_RECEIVED: Zap,
  ON_DEMAND_REQUEST_ACCEPTED: CheckCircle,
  ON_DEMAND_REQUEST_DECLINED: XCircle,
  ON_DEMAND_REQUEST_COMPLETED: Check,
  REVIEW_RECEIVED: Star,
  PAYOUT_PROCESSED: Banknote,
  GENERAL: Bell,
};

function formatTime(d: Date | string): string {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-TT", { month: "short", day: "numeric" });
}

type Props = {
  initialUnreadCount: number;
  variant?: "light" | "dark";
  /** 32×32-style control: smaller hit target, unread shown as a scarlet dot only (no count badge). */
  compactToolbar?: boolean;
};

export default function NotificationBell({
  initialUnreadCount,
  variant = "light",
  compactToolbar = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await getNotifications();
      const unread = data.filter((n) => !n.isRead).length;
      setNotifications(data as Notification[]);
      setUnreadCount(unread);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    setOpen((prev) => !prev);
    if (!loaded) {
      const data = await getNotifications();
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.isRead).length);
      setLoaded(true);
    }
  }

  async function handleMarkRead(notification: Notification) {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    if (notification.linkUrl) {
      setOpen(false);
      // Avoid App Router SPA navigation: router.push has been rewriting some
      // same-page query URLs (e.g. /dashboard/vendor?tab=reviews → /dashboard/vendor/reviews).
      // Full navigation uses link_url verbatim from the server.
      window.location.assign(notification.linkUrl);
    }
  }

  async function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  }

  const iconClass =
    variant === "dark"
      ? "text-zinc-300 hover:text-white"
      : "text-zinc-600 hover:text-zinc-900";

  const btnSize = compactToolbar ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  const iconPx = compactToolbar ? 18 : 20;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className={`relative flex items-center justify-center transition-colors ${btnSize} ${iconClass}`}
        aria-label="Notifications"
      >
        <svg
          width={iconPx}
          height={iconPx}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 ? (
          compactToolbar ? (
            <span className="absolute right-1 top-1 h-2 w-2 shrink-0 rounded-full bg-[#D4450A] ring-2 ring-white" />
          ) : (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4450A] text-[9px] font-black text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )
        ) : null}
      </button>

      {/* Dropdown */}
      {open ? (
        <div className="fixed left-4 right-4 top-16 z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-80">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-zinc-900">Notifications</p>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#D4450A] px-1.5 py-0.5 text-[10px] font-black text-white">
                  {unreadCount}
                </span>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs font-semibold text-zinc-400 transition-colors hover:text-[#D4450A] disabled:opacity-50"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {!loaded ? (
              <div className="divide-y divide-zinc-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <NotificationRowSkeleton key={i} />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className={`${icn.empty} mb-2`} aria-hidden strokeWidth={1.25} />
                <p className="text-sm font-semibold text-zinc-700">All caught up</p>
                <p className="mt-0.5 text-xs text-zinc-400">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {notifications.map((notification) => {
                  const Icon = TYPE_ICON[notification.type] ?? Bell;
                  return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleMarkRead(notification)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
                      !notification.isRead ? "bg-[#D4450A]/5" : ""
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 shrink-0 ${notificationRowIconClass(notification.type)}`}
                      aria-hidden
                      strokeWidth={2}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold leading-5 ${
                          !notification.isRead ? "text-zinc-900" : "text-zinc-700"
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.body ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[10px] text-zinc-400">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead ? (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#D4450A]" />
                    ) : null}
                  </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 ? (
            <div className="border-t border-zinc-100 px-4 py-2.5 text-center">
              <p className="text-xs text-zinc-400">
                Showing last {notifications.length} notifications
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
