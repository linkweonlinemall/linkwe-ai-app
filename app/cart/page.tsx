import type { Metadata } from "next";
import CartPageClient from "@/components/cart/CartPageClient";
import styles from "@/components/customer/customer.module.css";

import { getCart } from "@/app/actions/cart";
import CartRecommendationsRow, {
  type CartRecommendation,
} from "@/components/cart/CartRecommendationsRow";
import PublicNav from "@/components/layout/PublicNav";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sellableStoreWhere } from "@/lib/store/sellable-store";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your cart and proceed to checkout.",
};

const PRODUCT_REC_SELECT = {
  id: true,
  name: true,
  slug: true,
  price: true,
  images: true,
  store: { select: { name: true, slug: true } },
} as const;

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
          isArchived: false,
          OR: [{ stock: null }, { stock: { gt: 0 } }],
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
        isArchived: false,
        OR: [{ stock: null }, { stock: { gt: 0 } }],
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

  const items = await getCart();
  const recommendations = await fetchCartRecommendations(items.map(item=>item.productId),items[0]?.product.store.slug??null);
  return <div className={`${styles.page} pb-mobile-public lg:pb-0`}><PublicNav user={user?{name:user.fullName??"Account",href:continueHref!}:null} dashboardHref={continueHref??undefined}/><main className={styles.container}><CartPageClient items={items} signedIn={!!session}/><CartRecommendationsRow products={recommendations}/><footer className={styles.footer}>We people. We business. We local.</footer></main></div>;
}
