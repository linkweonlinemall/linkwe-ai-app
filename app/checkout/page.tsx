import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";

import CheckoutClient from "./checkout-client";
import { typography, tw } from "@/lib/design-system";

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
          store: { select: { name: true, slug: true } },
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
      <div className={`mx-auto max-w-5xl px-4 py-8 sm:px-8`}>
        <h1 className={`mb-6 ${typography.h3} ${tw.textPrimary}`}>Checkout</h1>
        <CheckoutClient items={items} subtotal={subtotal} />
      </div>
    </div>
  );
}
