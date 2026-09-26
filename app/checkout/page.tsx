import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/layout/PublicNav";

import CheckoutClient from "./checkout-client";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import s from "./checkout.module.css";
import { parseCheckoutFields } from "@/lib/checkout/custom-fields";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase securely.",
};

export default async function CheckoutPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=%2Fcheckout");

  const userRecord = await prisma.user.findUnique({ where: { id: session.userId } });
  const continueHref = userRecord ? getRoleDashboardPath(userRecord.role) : null;

  const items = await prisma.productCartItem.findMany({
    where: { userId: session.userId },
    include: {
      variant: {select:{name:true,price:true,images:true}},
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
          checkoutFields: true,
          store: { select: { name: true, slug: true, checkoutFields: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) redirect("/cart");

  const subtotal = items.reduce((sum, i) => sum + (i.variant?.price ?? i.product.price) * i.quantity, 0);

  return (
    <div className={`${s.page} pb-mobile-public lg:pb-0`}>
      <PublicNav
        user={
          userRecord
            ? { name: userRecord.fullName ?? "Account", href: continueHref! }
            : null
        }
        dashboardHref={continueHref ?? undefined}
      />
      <main className={s.wrap}>
        <header className={s.hero}><Link href="/cart"><ArrowLeft size={14}/> Back to your cart</Link><div><div><p>THE GOOD STUFF IS ALMOST YOURS</p><h1>Let’s bring it home.</h1></div><span><LockKeyhole size={15}/> Secure WiPay checkout</span></div><p>Choose how your order reaches you, review the details and pay securely.</p></header>
        <CheckoutClient items={items.map((item) => ({ ...item, product: { ...item.product, price: item.variant?.price ?? item.product.price, name: item.variant ? `${item.product.name} · ${item.variant.name}` : item.product.name, images: item.variant?.images.length ? item.variant.images : item.product.images, checkoutFields: parseCheckoutFields(item.product.checkoutFields), store: { ...item.product.store, checkoutFields: parseCheckoutFields(item.product.store.checkoutFields) } } }))} subtotal={subtotal} initialPhone={userRecord?.phone ?? ""} />
      </main>
    </div>
  );
}
