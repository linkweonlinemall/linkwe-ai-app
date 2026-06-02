import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Bot,
  Calendar,
  ClipboardList,
  ConciergeBell,
  Hand,
  Heart,
  Package,
  Settings,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { icn } from "@/lib/iconography";
import { prisma } from "@/lib/prisma";
import { getRegionLabel } from "@/lib/regions/tt-regions";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "CUSTOMER");

  const [
    orders,
    cartCount,
    bookings,
    wishlistData,
    savedStoresData,
    digitalOrders,
    savedStoresTotal,
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
  ]);

  const wishlistCount = wishlistData?._count.items ?? 0;
  const savedStoresCount = savedStoresTotal;

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
    { label: "Shop with AI", href: "/chat", Icon: Bot },
    { label: "Browse shop", href: "/shop", Icon: ShoppingBag },
    { label: "Services", href: "/services", Icon: ConciergeBell },
    { label: "My requests", href: "/my-requests", Icon: ClipboardList },
    { label: "My orders", href: "/orders", Icon: Package },
    { label: "My tickets", href: "/my-tickets", Icon: Ticket },
    { label: "Bookings", href: "/bookings", Icon: Calendar },
    { label: "Wishlist", href: "/wishlist", Icon: Heart },
    { label: "Saved stores", href: "/saved-stores", Icon: Bookmark },
    { label: "Settings", href: "/dashboard/customer/settings", Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1C1C1A 0%, #2A1A0E 100%)" }}>
          <div className="relative px-6 py-8 sm:px-8">
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
                { value: orders.length, label: "Orders", href: "/orders" },
                { value: bookings.length, label: "Upcoming bookings", href: "/orders?tab=bookings" },
                { value: cartCount, label: "In cart", href: "/cart" },
                { value: wishlistCount, label: "Wishlisted", href: "/wishlist" },
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

        {/* Quick actions */}
        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
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
          {/* Recent orders */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
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
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
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

          {/* Wishlist preview */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60">
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
