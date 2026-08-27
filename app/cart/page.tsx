import Link from "next/link";
import type { Metadata } from "next";
import { Check, Package, ShoppingBag } from "lucide-react";

import { getCart, updateCartQuantity } from "@/app/actions/cart";
import CartRemoveButton from "@/components/cart/CartRemoveButton";
import CartRecommendationsRow, {
  type CartRecommendation,
} from "@/components/cart/CartRecommendationsRow";
import PublicNav from "@/components/layout/PublicNav";
import EmptyState from "@/components/ui/empty-state";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";
import { typography, radius, shadow, spacing, tw } from "@/lib/design-system";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your cart and proceed to checkout.",
};

const FREE_DELIVERY_THRESHOLD_TTD = 200;

const PRODUCT_REC_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  images: true,
  store: { select: { name: true, slug: true } },
} as const;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function estimatedDeliveryRangeLabel(userRegion: string | null | undefined): string {
  const norm = (userRegion ?? "").toLowerCase();
  let minOffset = 2;
  let maxOffset = 4;
  if (norm.includes("tobago")) {
    minOffset = 3;
    maxOffset = 5;
  } else if (["rio claro", "point fortin", "penal", "moruga", "siparia"].some((h) => norm.includes(h))) {
    minOffset = 3;
    maxOffset = 6;
  }
  const start = addDays(new Date(), minOffset);
  const end = addDays(new Date(), maxOffset);
  const fmtStart = start.toLocaleDateString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const fmtEnd = end.toLocaleDateString("en-TT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Estimated delivery: ${fmtStart} – ${fmtEnd}`;
}

async function fetchCartRecommendations(
  cartProductIds: string[],
  storeSlug: string | null,
): Promise<CartRecommendation[]> {
  const uniqExclude = [...new Set(cartProductIds)];
  const baseExclude = uniqExclude.length > 0 ? { id: { notIn: uniqExclude } as const } : {};

  let picked: CartRecommendation[] = [];

  if (storeSlug) {
    const store = await prisma.store.findFirst({
      where: { slug: storeSlug, ...sellableStoreWhere() },
      select: { id: true },
    });
    if (store) {
      picked = await prisma.product.findMany({
        where: {
          isPublished: true,
          isService: false,
          hasVariants: false,
          storeId: store.id,
          store: sellableStoreWhere(),
          ...baseExclude,
        },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: 4,
        select: PRODUCT_REC_SELECT,
      });
    }
  }

  if (picked.length < 4) {
    const usedIds = [...uniqExclude, ...picked.map((p) => p.id)];
    const more = await prisma.product.findMany({
      where: {
        isPublished: true,
        isService: false,
        hasVariants: false,
        store: sellableStoreWhere(),
        ...(usedIds.length > 0 ? { id: { notIn: usedIds } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 4 - picked.length,
      select: PRODUCT_REC_SELECT,
    });
    picked = [...picked, ...more];
  }

  return picked.slice(0, 4);
}

export default async function CartPage() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { fullName: true, role: true, region: true },
      })
    : null;
  const continueHref = user ? getRoleDashboardPath(user.role) : null;

  const rows = await getCart();
  const items = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: row.product,
    variant: row.variant ?? null,
  }));

  const total = items.reduce((sum, i) => {
    const price = i.variant?.price ?? i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const recommendations = await fetchCartRecommendations(
    items.map((i) => i.productId),
    items.length > 0 ? items[0]!.product.store.slug : null,
  );

  const amountToFree = Math.max(0, FREE_DELIVERY_THRESHOLD_TTD - total);
  const freeProgressPct = Math.min(100, (total / FREE_DELIVERY_THRESHOLD_TTD) * 100);
  const deliveryEstimate = estimatedDeliveryRangeLabel(user?.region ?? null);

  return (
    <div className={`min-h-screen pb-mobile-public ${tw.fontSans} antialiased lg:pb-0 ${tw.bgPage}`}>
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <div className={`mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-8`}>
        <div className="mb-8">
          <h1 className={`${typography.h3} ${tw.textPrimary}`}>
            Your Cart
            <span className={`ml-2 ${typography.body} font-medium text-zinc-500`}>
              ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </span>
          </h1>
        </div>

        {items.length === 0 ? (
          <>
            <div className={`${radius.card} bg-white ${shadow.card}`}>
              <EmptyState
                icon={<ShoppingBag strokeWidth={1.25} className="text-current" />}
                title="Your cart is empty"
                description="Discover local vendors across Trinidad & Tobago."
                actionLabel="Start shopping"
                actionHref="/shop"
              />
            </div>
            {recommendations.length > 0 ? <CartRecommendationsRow products={recommendations} /> : null}
          </>
        ) : (
          <div className={`grid grid-cols-1 lg:grid-cols-3 ${spacing.cardGap}`}>
            <div className="min-w-0 space-y-4 lg:col-span-2">
              <div className={`flex flex-col gap-4 ${radius.card} bg-white ${spacing.cardPadding} ${shadow.card}`}>
                {items.map((item) => {
                  const img = item.product.images[0];
                  const atMaxStock =
                    item.product.stock !== null && item.quantity >= item.product.stock;
                  return (
                    <div
                      key={item.id}
                      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-zinc-100 pb-5 last:border-0 last:pb-0 sm:flex sm:gap-5"
                    >
                      <div className={`flex size-[72px] shrink-0 overflow-hidden sm:size-[88px] ${radius.card} bg-zinc-100 ${shadow.card}`}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="size-10 text-zinc-300" strokeWidth={1.25} aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/store/${item.product.store.slug}`} className={`text-xs text-zinc-500 ${tw.hoverTextScarlet}`}>
                          {item.product.store.name}
                        </Link>
                        {item.variant ? (
                          <p className="text-xs text-zinc-500">
                            {(item.variant.attributes as { name: string; value: string }[])
                              .map((a) => a.value)
                              .join(" / ")}
                          </p>
                        ) : null}
                        <Link href={`/products/${item.product.slug}`}>
                          <p className={`${typography.bodySmall} font-semibold ${tw.textPrimary} ${tw.hoverTextScarlet}`}>{item.product.name}</p>
                        </Link>
                        <p className={`mt-2 ${typography.body} font-bold ${tw.textScarlet}`}>
                          TTD {(item.variant?.price ?? item.product.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="col-span-2 flex min-w-0 flex-row-reverse items-center justify-between gap-3 sm:col-auto sm:flex-col sm:items-end sm:self-stretch">
                        <CartRemoveButton cartItemId={item.id} productName={item.product.name} />
                        <div className={`flex min-h-[44px] items-center gap-2 ${radius.card} border border-zinc-200 bg-zinc-50 px-2`}>
                          <form action={updateCartQuantity.bind(null, item.id, item.quantity - 1)}>
                            <button
                              type="submit"
                              className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-lg font-medium text-zinc-700 hover:bg-white`}
                            >
                              −
                            </button>
                          </form>
                          <span className={`min-w-[1.75rem] text-center ${typography.bodySmall} font-semibold ${tw.textPrimary}`}>{item.quantity}</span>
                          <form action={updateCartQuantity.bind(null, item.id, item.quantity + 1)}>
                            <button
                              type="submit"
                              disabled={atMaxStock}
                              className={`flex min-h-[44px] min-w-[44px] items-center justify-center text-lg font-medium text-zinc-700 hover:bg-white disabled:opacity-35`}
                            >
                              +
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <CartRecommendationsRow products={recommendations} />
            </div>

            <div className="lg:col-span-1">
              <div className={`space-y-4 ${radius.card} bg-white ${spacing.cardPadding} ${shadow.card} lg:sticky lg:top-24`}>
                {amountToFree > 0 ? (
                  <div>
                    <p className={`${typography.bodySmall} font-semibold ${tw.textPrimary}`}>
                      Add TTD {amountToFree.toFixed(2)} more for free delivery
                    </p>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full ${radius.pill} ${tw.bgScarlet} transition-all`}
                        style={{ width: `${freeProgressPct}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className={`inline-flex items-center gap-2 ${radius.card} bg-emerald-50 px-3 py-2 ${typography.bodySmall} font-semibold text-emerald-700`}>
                    <Check className="size-4 shrink-0 text-emerald-600" aria-hidden strokeWidth={2.5} />
                    You&apos;ve unlocked free delivery
                  </p>
                )}

                <h2 className={`${typography.h4} ${tw.textPrimary}`}>Order Summary</h2>
                <div className={`flex justify-between py-2 ${typography.bodySmall} text-zinc-600`}>
                  <span>Subtotal</span>
                  <span>TTD {total.toFixed(2)}</span>
                </div>
                <div className={`flex flex-col gap-0.5 py-2 ${typography.bodySmall} text-zinc-600`}>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <p className="text-xs text-zinc-500">{deliveryEstimate}</p>
                </div>
                <div className="border-t border-zinc-100 pt-4" />
                <div className="flex justify-between">
                  <span className={`${typography.bodySmall} font-bold ${tw.textPrimary}`}>Total</span>
                  <span className={`text-lg font-bold ${tw.textScarlet}`}>TTD {total.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <Link
                    href="/checkout"
                    className={`flex flex-1 items-center justify-center ${radius.button} ${tw.bgScarlet} px-5 py-3 text-center text-sm font-bold text-white ${shadow.card} transition-opacity hover:opacity-90`}
                  >
                    Checkout
                  </Link>
                  <Link
                    href="/shop"
                    className={`flex flex-1 items-center justify-center ${radius.button} border-2 border-zinc-900/20 bg-transparent px-5 py-3 text-center text-sm font-bold ${tw.textPrimary} ${shadow.card} transition-colors hover:border-zinc-900/40`}
                  >
                    Continue shopping
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-12 py-6 text-center">
        <p className="text-xs text-zinc-400">
          <Link href="/" className={`font-semibold ${tw.textScarlet} hover:underline`}>
            LinkWe
          </Link>{" "}
          — Trinidad &amp; Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
