import Link from "next/link";

import { getCart, removeFromCart, updateCartQuantity } from "@/app/actions/cart";
import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function getDashboardPath(role: string) {
  if (role === "VENDOR") return "/dashboard/vendor";
  if (role === "COURIER") return "/dashboard/courier";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/customer";
}

export default async function CartPage() {
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const continueHref = user ? getDashboardPath(user.role) : null;

  const rows = await getCart();
  const items = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: row.product,
  }));

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <PublicNav
        user={user ? { name: user.fullName ?? "Account", href: continueHref! } : null}
        dashboardHref={continueHref ?? undefined}
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Your Cart
            <span className="ml-2 text-base font-normal" style={{ color: "var(--text-muted)" }}>
              ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </span>
          </h1>
          <a
            href="/store"
            className="w-fit shrink-0 text-sm hover:underline min-[400px]:ml-auto"
            style={{ color: "var(--blue)" }}
          >
            Continue shopping
          </a>
        </div>

        {items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mb-4 text-5xl">🛒</p>
            <h2 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Your cart is empty
            </h2>
            <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Browse stores to find products you&apos;ll love
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--scarlet)" }}
            >
              Start shopping →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 flex flex-col gap-3 lg:col-span-2">
              {items.map((item) => {
                const img = item.product.images[0];
                const atMaxStock =
                  item.product.stock !== null && item.quantity >= item.product.stock;
                return (
                  <div
                    key={item.id}
                    className="flex min-w-0 gap-4 rounded-xl bg-white p-4"
                    style={{ border: "1px solid var(--card-border)" }}
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.product.store.name}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-sm font-bold" style={{ color: "var(--scarlet)" }}>
                        TTD {item.product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
                      <form action={removeFromCart.bind(null, item.productId)}>
                        <button
                          type="submit"
                          className="text-xs hover:text-red-500"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Remove
                        </button>
                      </form>
                      <div
                        className="flex items-center gap-2 rounded-lg border px-2 py-1"
                        style={{ borderColor: "var(--card-border)" }}
                      >
                        <form action={updateCartQuantity.bind(null, item.productId, item.quantity - 1)}>
                          <button
                            type="submit"
                            className="flex h-6 w-6 items-center justify-center text-lg font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            −
                          </button>
                        </form>
                        <span
                          className="w-6 text-center text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {item.quantity}
                        </span>
                        <form action={updateCartQuantity.bind(null, item.productId, item.quantity + 1)}>
                          <button
                            type="submit"
                            disabled={atMaxStock}
                            className="flex h-6 w-6 items-center justify-center text-lg font-medium disabled:opacity-40"
                            style={{ color: "var(--text-muted)" }}
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

            <div className="lg:col-span-1">
              <div
                className="rounded-xl bg-white p-5 lg:sticky lg:top-24"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Order Summary
                </h2>
                <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Subtotal</span>
                  <span>TTD {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="my-3 border-t" style={{ borderColor: "var(--card-border-subtle)" }} />
                <div className="flex justify-between">
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    Total
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--scarlet)" }}>
                    TTD {total.toFixed(2)}
                  </span>
                </div>
                <Link
                  href="/checkout"
                  className="mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer
        className="mt-12 py-6 text-center"
        style={{ borderTop: "1px solid var(--card-border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          <a href="/" style={{ color: "var(--scarlet)" }}>
            LinkWe
          </a>{" "}
          — Trinidad & Tobago&apos;s Marketplace
        </p>
      </footer>
    </div>
  );
}
