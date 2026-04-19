import { redirect } from "next/navigation";

import PublicNav from "@/components/layout/PublicNav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import CheckoutClient from "./checkout-client";

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const items = await prisma.productCartItem.findMany({
    where: { userId: session.userId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          images: true,
          stock: true,
          allowDelivery: true,
          allowPickup: true,
          deliveryFee: true,
          storeId: true,
          store: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) redirect("/cart");

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PublicNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Checkout</h1>
        <CheckoutClient items={items} subtotal={subtotal} />
      </div>
    </div>
  );
}
