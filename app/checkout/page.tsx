import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";

import CheckoutClient from "./checkout-client";
import { typography, tw } from "@/lib/design-system";
import Image from "next/image";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase securely.",
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

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
          isDigital: true,
          store: { select: { name: true, slug: true, checkoutFields: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) redirect("/cart");

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <div className={`min-h-screen ${tw.bgPage} pb-mobile-public lg:pb-0 ${tw.fontSans}`}>
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-amber-50 p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-orange-100">
              <Image src="/linkwe-logo-on-dark.png" alt="LinkWe" width={44} height={44} className="h-11 w-11 object-contain" />
            </div>
            <div>
              <h1 className={`${typography.h3} ${tw.textPrimary}`}>Secure checkout</h1>
              <p className="mt-1 text-sm text-zinc-600">Review your order and pay securely with WiPay.</p>
            </div>
          </div>
        </div>
        <CheckoutClient items={items.map((item) => ({ ...item, product: { ...item.product, store: { ...item.product.store, checkoutFields: parseCheckoutFields(item.product.store.checkoutFields) } } }))} subtotal={subtotal} initialPhone={userRecord?.phone ?? ""} />
      </div>
    </div>
  );
}
