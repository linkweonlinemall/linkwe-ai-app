import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Calendar,
  ClipboardList,
  ConciergeBell,
  Hand,
  Heart,
  MessageCircle,
  Package,
  RefreshCw,
  Settings,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { getMyConversations, getUnreadCount as getMessageUnreadCount } from "@/app/actions/messages";
import {
  getNotifications,
  getUnreadCount as getNotificationUnreadCount,
} from "@/app/actions/notifications";
import { getUpcomingTicketsPreview } from "@/app/actions/tickets";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import {
  formatEventDateShort,
  formatEventTime,
} from "@/lib/events/format-datetime";
import { icn } from "@/lib/iconography";
import { formatConversationListTime } from "@/lib/messages/format-time";
import { prisma } from "@/lib/prisma";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import NotificationBell from "@/components/ui/NotificationBell";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "CUSTOMER");

  const [
    orders,
    orderCount,
    cartCount,
    bookings,
    upcomingBookingsCount,
    wishlistData,
    savedStoresData,
    digitalOrders,
    savedStoresTotal,
    conversationsResult,
    messageUnreadResult,
    upcomingTicketEvents,
    notificationsList,
    notificationUnreadCount,
  ] = await Promise.all([
    prisma.mainOrder.findMany({
      where: { buyerId: session.userId },
      select: {
        id: true,
        referenceNumber: true,
        createdAt: true,
        status: true,
        totalMinor: true,
        items: {
          take: 1,
          select: {
            titleSnapshot: true,
            product: { select: { images: true, isDigital: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.mainOrder.count({ where: { buyerId: session.userId } }),
    prisma.productCartItem.count({ where: { userId: session.userId } }),
    prisma.productBooking.findMany({
      where: {
        customerId: session.userId,
        bookingDate: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: {
        id: true,
        bookingDate: true,
        startTime: true,
        status: true,
        product: {
          select: {
            name: true,
            slug: true,
            images: true,
            store: { select: { name: true } },
          },
        },
      },
      orderBy: { bookingDate: "asc" },
      take: 3,
    }),
    prisma.productBooking.count({
      where: {
        customerId: session.userId,
        bookingDate: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.wishlist.findUnique({
      where: { userId: session.userId },
      select: {
        _count: { select: { items: true } },
        items: {
          take: 4,
          orderBy: { createdAt: "desc" },
          select: {
            productId: true,
            product: {
              select: {
                name: true,
                slug: true,
                price: true,
                images: true,
              },
            },
          },
        },
      },
    }),
    prisma.savedStore.findMany({
      where: { userId: session.userId },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: {
        storeId: true,
        store: {
          select: {
            name: true,
            slug: true,
            logoUrl: true,
            region: true,
          },
        },
      },
    }),
    prisma.mainOrder.findMany({
      where: {
        buyerId: session.userId,
        items: {
          some: {
            product: { isDigital: true },
          },
        },
      },
      select: {
        id: true,
        items: {
          where: {
            product: { isDigital: true },
          },
          select: {
            titleSnapshot: true,
            product: {
              select: {
                name: true,
                slug: true,
                digitalFileUrl: true,
                fileType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.savedStore.count({ where: { userId: session.userId } }),
    getMyConversations(),
    getMessageUnreadCount(),
    getUpcomingTicketsPreview(session.userId, 3),
    getNotifications(),
    getNotificationUnreadCount(),
  ]);

  const wishlistCount = wishlistData?._count.items ?? 0;
  const savedStoresCount = savedStoresTotal;

  const messageUnreadCount =
    messageUnreadResult && "count" in messageUnreadResult ? messageUnreadResult.count : 0;
  const messageConversations =
    conversationsResult.ok && conversationsResult.side === "customer"
      ? conversationsResult.conversations.slice(0, 3)
      : [];
  const notificationPreview = notificationsList.slice(0, 4);

  function formatTime(t: string): string {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  }

  function formatDate(d: Date | string): string {
    return new Date(d).toLocaleDateString("en-TT", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  const firstName = session.fullName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quickActions: { label: string; href: string; Icon: LucideIcon }[] = [
    { label: "Browse shop", href: "/shop", Icon: ShoppingBag },
    { label: "Services", href: "/services", Icon: ConciergeBell },
    { label: "My requests", href: "/my-requests", Icon: ClipboardList },
    { label: "My orders", href: "/orders", Icon: Package },
    { label: "My tickets", href: "/my-tickets", Icon: Ticket },
    { label: "Bookings", href: "/bookings", Icon: Calendar },
    { label: "My subscriptions", href: "/dashboard/customer/subscriptions", Icon: RefreshCw },
    { label: "Wishlist", href: "/wishlist", Icon: Heart },
    { label: "Saved stores", href: "/saved-stores", Icon: Bookmark },
    { label: "Settings", href: "/dashboard/customer/settings", Icon: Settings },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-5 overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_70px_rgba(28,28,26,.18)]" style={{ background: "radial-gradient(circle at 88% 0%, rgba(242,138,45,.42), transparent 34%), radial-gradient(circle at 10% 100%, rgba(26,127,181,.18), transparent 36%), linear-gradient(135deg, #161614 0%, #342012 100%)" }}>
          <div className="relative px-6 py-8 sm:px-8">
            <div className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur sm:right-6 sm:top-6"><NotificationBell initialUnreadCount={notificationUnreadCount} variant="dark" compactToolbar /></div>
            <div
              className="absolute right-0 top-0 h-48 w-48 rounded-full opacity-10 blur-3xl"
              style={{ background: "radial-gradient(circle, #E8820C, transparent)" }}
            />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{greeting}</p>
            <h1 className="font-display mt-1 flex flex-wrap items-center gap-2 text-3xl font-bold text-white sm:text-4xl">
              <span>{firstName}</span>
              <Hand className="size-8 shrink-0 text-[#E8820C]" aria-hidden strokeWidth={2} />
            </h1>
            <p className="mt-2 text-sm text-zinc-400">Here is what is happening with your account</p>

            {/* Quick stats */}
            <div className="mt-6 flex flex-wrap gap-4">
              {[
                { value: orderCount, label: "Orders", href: "/orders" },
                { value: upcomingBookingsCount, label: "Upcoming bookings", href: "/orders?tab=bookings" },
                { value: cartCount, label: "In cart", href: "/cart" },
                { value: wishlistCount, label: "Wishlisted", href: "/wishlist" },
                { value: messageUnreadCount, label: "Unread messages", href: "/messages" },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all hover:bg-white/10"
                >
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <nav className="sticky top-2 z-20 mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/90 p-2 shadow-[0_10px_35px_rgba(28,28,26,.10)] backdrop-blur-xl" aria-label="Customer dashboard sections">
          {[{label:"Overview",href:"#overview"},{label:"Orders",href:"#orders"},{label:"Bookings",href:"#bookings"},{label:"Tickets",href:"#tickets"},{label:"Saved",href:"#saved"},{label:"Messages",href:"#messages"}].map((tab)=><a key={tab.href} href={tab.href} className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-600 transition hover:bg-[#FFF0E8] hover:text-[#D4450A]">{tab.label}</a>)}
        </nav>

        {/* Quick actions */}
        <div id="overview" className="mb-6 grid scroll-mt-24 grid-cols-3 gap-3 sm:grid-cols-6">
          {quickActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <item.Icon className={`${icn.header} text-gray-600`} aria-hidden strokeWidth={2} />
              <p className="text-xs font-semibold text-zinc-700">{item.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Messages */}
          <div id="messages" className="scroll-mt-24 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">
                Messages
                {messageUnreadCount > 0 ? (
                  <span className="ml-2 rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {messageUnreadCount}
                  </span>
                ) : null}
              </h2>
              <Link href="/messages" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {messageConversations.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <MessageCircle className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="text-sm text-zinc-500">No messages yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {messageConversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {conversation.storeLogoUrl ? (
                        <img
                          src={conversation.storeLogoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#D4450A]">
                          {conversation.storeName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {conversation.storeName}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {conversation.lastMessageText?.trim() || "No messages yet"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-[10px] text-zinc-400">
                        {formatConversationListTime(conversation.lastMessageAt)}
                      </p>
                      {conversation.unread > 0 ? (
                        <span
                          className="h-2 w-2 rounded-full bg-[#D4450A]"
                          aria-label={`${conversation.unread} unread`}
                        />
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">
                Notifications
                {notificationUnreadCount > 0 ? (
                  <span className="ml-2 rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {notificationUnreadCount}
                  </span>
                ) : null}
              </h2>
              {notificationsList.length > 0 ? (
                <span className="text-xs font-semibold text-zinc-400">
                  {notificationsList.length} total
                </span>
              ) : null}
            </div>
            {notificationPreview.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bell className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="text-sm text-zinc-500">You&apos;re all caught up.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {notificationPreview.map((notification) => {
                  const row = (
                    <>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            !notification.isRead ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {formatConversationListTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead ? (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#D4450A]"
                          aria-hidden
                        />
                      ) : null}
                    </>
                  );

                  if (notification.linkUrl) {
                    return (
                      <Link
                        key={notification.id}
                        href={notification.linkUrl}
                        className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                      >
                        {row}
                      </Link>
                    );
                  }

                  return (
                    <div key={notification.id} className="flex items-start gap-3 px-5 py-3.5">
                      {row}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div id="orders" className="scroll-mt-24 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">Recent orders</h2>
              <Link href="/orders" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Package className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="mb-4 text-sm text-zinc-500">No orders yet</p>
                <Link href="/shop" className="rounded-xl bg-[#D4450A] px-5 py-2.5 text-xs font-bold text-white hover:opacity-90">
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {orders.map((order) => {
                  const thumb = order.items[0]?.product?.images?.[0];
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className={`${icn.ui} text-zinc-300`} aria-hidden strokeWidth={2} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900">#{order.referenceNumber}</p>
                        <p className="text-xs text-zinc-400">
                          {new Date(order.createdAt).toLocaleDateString("en-TT", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-900">TTD {(order.totalMinor / 100).toFixed(2)}</p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            order.status === "DELIVERED" || order.status === "CUSTOMER_RECEIVED"
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming bookings */}
          <div id="bookings" className="scroll-mt-24 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">Upcoming bookings</h2>
              <Link href="/orders?tab=bookings" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Calendar className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="mb-4 text-sm text-zinc-500">No upcoming bookings</p>
                <Link href="/services" className="rounded-xl bg-[#D4450A] px-5 py-2.5 text-xs font-bold text-white hover:opacity-90">
                  Browse services
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {booking.product.images[0] ? (
                        <img src={booking.product.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ConciergeBell className={`${icn.ui} text-zinc-300`} aria-hidden strokeWidth={2} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{booking.product.name}</p>
                      <p className="text-xs text-zinc-400">{booking.product.store.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-900">{formatDate(booking.bookingDate)}</p>
                      <p className="text-xs text-zinc-400">{formatTime(booking.startTime)}</p>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          booking.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My tickets */}
          <div id="tickets" className="scroll-mt-24 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">My tickets</h2>
              <Link href="/my-tickets" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {upcomingTicketEvents.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Ticket className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="text-sm text-zinc-500">No upcoming events.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {upcomingTicketEvents.map((eventPreview) => (
                  <Link
                    key={eventPreview.eventId}
                    href="/my-tickets"
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF0EB]">
                      <Ticket className={`${icn.ui} text-[#D4450A]`} aria-hidden strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {eventPreview.eventTitle}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {formatEventDateShort(eventPreview.eventStartDate)} ·{" "}
                        {formatEventTime(eventPreview.eventStartDate)}
                      </p>
                    </div>
                    {eventPreview.ticketCount > 1 ? (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                        {eventPreview.ticketCount} tickets
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Wishlist preview */}
          <div id="saved" className="scroll-mt-24 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">
                Wishlist
                {wishlistCount > 0 ? (
                  <span className="ml-2 rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {wishlistCount}
                  </span>
                ) : null}
              </h2>
              <Link href="/wishlist" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {wishlistCount === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Heart className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="mb-4 text-sm text-zinc-500">No items saved yet</p>
                <Link href="/shop" className="rounded-xl bg-[#D4450A] px-5 py-2.5 text-xs font-bold text-white hover:opacity-90">
                  Browse shop
                </Link>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-4 gap-2">
                  {wishlistData?.items.map((item) => (
                    <Link key={item.productId} href={`/products/${item.product.slug}`} className="group overflow-hidden rounded-xl bg-zinc-100">
                      <div className="aspect-square overflow-hidden">
                        {item.product.images[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className={`${icn.header} text-zinc-300`} aria-hidden strokeWidth={2} />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                {wishlistCount > 4 ? (
                  <p className="mt-3 text-center text-xs text-zinc-400">+{wishlistCount - 4} more items</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Saved stores */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-bold text-zinc-900">
                Saved stores
                {savedStoresCount > 0 ? (
                  <span className="ml-2 rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {savedStoresCount}
                  </span>
                ) : null}
              </h2>
              <Link href="/saved-stores" className="text-xs font-semibold text-[#D4450A] hover:underline">
                View all →
              </Link>
            </div>
            {savedStoresCount === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Bookmark className={`${icn.empty} mb-3`} aria-hidden strokeWidth={1.25} />
                <p className="mb-4 text-sm text-zinc-500">No saved stores yet</p>
                <Link href="/stores" className="rounded-xl bg-[#D4450A] px-5 py-2.5 text-xs font-bold text-white hover:opacity-90">
                  Browse stores
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {savedStoresData.map((item) => (
                  <Link
                    key={item.storeId}
                    href={`/store/${item.store.slug}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                      {item.store.logoUrl ? (
                        <img src={item.store.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center text-sm font-black text-white"
                          style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                        >
                          {item.store.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">{item.store.name}</p>
                      <p className="text-xs text-zinc-400">{getRegionLabel(item.store.region)}</p>
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 text-zinc-300"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Digital downloads */}
          {digitalOrders.length > 0 ? (
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <h2 className="font-bold text-zinc-900">Digital downloads</h2>
                <Link href="/orders" className="text-xs font-semibold text-[#D4450A] hover:underline">
                  View orders →
                </Link>
              </div>
              <div className="divide-y divide-zinc-50">
                {digitalOrders.flatMap((order) =>
                  order.items
                    .filter((item) => item.product?.digitalFileUrl)
                    .map((item, i) => {
                      const url = item.product!.digitalFileUrl!;
                      const downloadHref = url.includes("res.cloudinary.com")
                        ? url.replace("/upload/", "/upload/fl_attachment/")
                        : url;
                      return (
                        <div key={`${order.id}-${item.product!.slug}-${i}`} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A7FB5]/10">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A7FB5" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-900">{item.product!.name}</p>
                            {item.product!.fileType ? (
                              <p className="text-xs uppercase text-zinc-400">{item.product!.fileType}</p>
                            ) : null}
                          </div>
                          <a
                            href={downloadHref}
                            download
                            rel="noopener noreferrer"
                            target="_blank"
                            className="shrink-0 rounded-xl bg-[#1A7FB5] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                          >
                            Download
                          </a>
                        </div>
                      );
                    }),
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
