import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Heart, Package } from "lucide-react";

import { getWishlistItems } from "@/app/actions/wishlist";
import PublicNav from "@/components/layout/PublicNav";
import WishlistButton from "@/components/ui/WishlistButton";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { icn } from "@/lib/iconography";
import { prisma } from "@/lib/prisma";
import { formatTTDPrice } from "@/lib/format/price";

export const metadata: Metadata = {
  title: "My wishlist",
  description: "Products you have saved to buy later.",
};

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();
  const items = await getWishlistItems();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-zinc-900">
              My <span className="italic text-[#D4450A]">wishlist</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {items.length} item{items.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link
            href="/shop"
            className="rounded-xl border-2 border-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
          >
            Browse shop
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-24 text-center">
            <Heart className={`${icn.empty} mb-4`} aria-hidden strokeWidth={1.25} />
            <h2 className="mb-2 text-lg font-bold text-zinc-900">Your wishlist is empty</h2>
            <p className="mb-6 text-sm text-zinc-500">Save products you love to buy later</p>
            <Link href="/shop" className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90">
              Start browsing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.product.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden bg-zinc-100">
                  {item.product.images[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className={`${icn.ui} text-zinc-300`} aria-hidden strokeWidth={2} />
                    </div>
                  )}
                  {!item.product.isPublished ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-zinc-700">
                        Unavailable
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute right-2 top-2">
                    <WishlistButton productId={item.productId} initialWishlisted={true} size="sm" />
                  </div>
                  {item.product.isDigital ? (
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#1A7FB5] px-2 py-0.5 text-[9px] font-bold text-white">
                      <Download className="size-3 shrink-0" aria-hidden strokeWidth={2.5} />
                      Digital
                    </div>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="mb-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {item.product.store.name}
                  </p>
                  <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-[#D4450A]">
                    {item.product.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-sm font-black text-[#D4450A]">{formatTTDPrice(item.product.price)}</p>
                    {item.product.compareAtPrice && item.product.compareAtPrice > item.product.price ? (
                      <p className="text-xs text-zinc-400 line-through">TTD {item.product.compareAtPrice.toFixed(2)}</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
