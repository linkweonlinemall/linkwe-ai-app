import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSavedStores } from "@/app/actions/wishlist";
import PublicNav from "@/components/layout/PublicNav";
import SaveStoreButton from "@/components/ui/SaveStoreButton";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getRegionLabel } from "@/lib/regions/tt-regions";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Saved stores",
  description: "Stores you follow on LinkWe.",
};

export default async function SavedStoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = user ? getRoleDashboardPath(user.role) : null;
  const unreadCount = await getNavUnreadCount();
  const saved = await getSavedStores();

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-16 sm:pb-0">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
        unreadCount={unreadCount}
      />
      <div className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-zinc-900">
              Saved <span className="italic text-[#D4450A]">stores</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {saved.length} store{saved.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <Link
            href="/stores"
            className="rounded-xl border-2 border-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white"
          >
            Browse stores
          </Link>
        </div>

        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-24 text-center">
            <span className="mb-4 text-6xl">🔖</span>
            <h2 className="mb-2 text-lg font-bold text-zinc-900">No saved stores yet</h2>
            <p className="mb-6 text-sm text-zinc-500">Save stores you love to find them easily later</p>
            <Link href="/stores" className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90">
              Browse stores
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((item) => (
              <div
                key={item.id}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link href={`/store/${item.store.slug}`}>
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900">
                    {item.store.coverPhotoUrl ? (
                      <img
                        src={item.store.coverPhotoUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full"
                        style={{
                          background: "linear-gradient(135deg, #1C1C1A 0%, #3a3935 50%, #D4450A20 100%)",
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-end gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border-2 border-white/90 shadow-lg">
                        {item.store.logoUrl ? (
                          <img src={item.store.logoUrl} alt={item.store.name} className="h-full w-full object-cover" />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center font-black text-white"
                            style={{ background: "linear-gradient(135deg, #D4450A, #E8820C)" }}
                          >
                            {item.store.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{item.store.name}</p>
                        <p className="text-xs text-white/70">{getRegionLabel(item.store.region)}</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between p-4">
                  <div>
                    {item.store.tagline ? (
                      <p className="line-clamp-1 text-xs text-zinc-500">{item.store.tagline}</p>
                    ) : null}
                    <p className="text-xs text-zinc-400">
                      {item.store._count.products} product{item.store._count.products !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveStoreButton storeId={item.storeId} initialSaved={true} />
                    <Link
                      href={`/store/${item.store.slug}`}
                      className="rounded-xl bg-[#D4450A] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                    >
                      Visit →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
