"use server";

import { getSession } from "@/lib/auth/session";
import { getAITopupBundle } from "@/lib/finance/ai-topup-bundles";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/stripe";

export type StartAITopupCheckoutResult =
  | { ok: true; clientSecret: string; purchaseId: string }
  | { ok: false; error: string };

export async function startAITopupCheckout(
  bundleKey: string,
): Promise<StartAITopupCheckoutResult> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    return { ok: false, error: "Not authorized." };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) {
    return { ok: false, error: "No store found." };
  }

  const bundle = getAITopupBundle(bundleKey);
  if (!bundle) {
    return { ok: false, error: "Invalid bundle." };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: bundle.priceMinor,
      currency: "ttd",
      metadata: {
        aiTopupStoreId: store.id,
        aiTopupBundleKey: bundle.key,
        usesPurchased: String(bundle.uses),
        userId: session.userId,
      },
    });
  } catch (e) {
    console.error("[ai-topup] stripe", e);
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  const clientSecret = paymentIntent.client_secret;
  if (!clientSecret) {
    return { ok: false, error: "Payment setup failed. Please try again." };
  }

  try {
    const purchase = await prisma.aITopupPurchase.create({
      data: {
        storeId: store.id,
        usesPurchased: bundle.uses,
        pricePaidMinor: bundle.priceMinor,
        stripePaymentIntentId: paymentIntent.id,
        status: "PENDING",
      },
      select: { id: true },
    });

    return { ok: true, clientSecret, purchaseId: purchase.id };
  } catch (e) {
    console.error("[ai-topup] create purchase", e);
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}
