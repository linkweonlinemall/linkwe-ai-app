import Link from "next/link";

import { getCart, removeFromCart, updateCartQuantity } from "@/app/actions/cart";

export default async function CartPage() {
  const rows = await getCart();
  const items = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    product: row.product,
  }));

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          ← Continue shopping
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm">
                <p className="text-zinc-500">Your cart is empty</p>
                <Link href="/" className="mt-4 text-sm font-medium" style={{ color: "#D4450A" }}>
                  Start shopping →
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => {
                  const img = item.product.images[0];
                  const atMaxStock =
                    item.product.stock !== null && item.quantity >= item.product.stock;
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-zinc-900">{item.product.name}</p>
                        <p className="text-sm text-zinc-500">{item.product.store.name}</p>
                        <p className="mt-1 text-sm text-zinc-900">
                          TTD {item.product.price.toFixed(2)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <form action={updateCartQuantity.bind(null, item.productId, item.quantity - 1)}>
                              <button
                                type="submit"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                              >
                                −
                              </button>
                            </form>
                            <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                            <form action={updateCartQuantity.bind(null, item.productId, item.quantity + 1)}>
                              <button
                                type="submit"
                                disabled={atMaxStock}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                +
                              </button>
                            </form>
                          </div>
                          <form action={removeFromCart.bind(null, item.productId)}>
                            <button type="submit" className="text-sm text-red-500 hover:text-red-600">
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Order summary</h2>
              <div className="mt-4 flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span>TTD {total.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">Shipping: Calculated at checkout</p>
              <hr className="my-4 border-zinc-100" />
              <div className="flex justify-between text-base font-bold text-zinc-900">
                <span>Total</span>
                <span>TTD {total.toFixed(2)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-3 flex w-full items-center justify-center rounded-xl py-3 text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: "#D4450A" }}
              >
                Proceed to checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
