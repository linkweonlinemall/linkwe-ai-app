"use server";

import type { AccountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { chargeSubscriptionFromBalance } from "@/lib/finance/subscription-billing";
import { PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";
import { isVendorBalanceDebit } from "@/lib/finance/vendor-balance";
import { prisma } from "@/lib/prisma";
import { beginWiPaySubscription } from "@/lib/wipay/subscriptions";

export async function saveVendorBankDetails(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") {
    redirect("/");
  }

  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountName = String(formData.get("accountName") ?? "").trim();
  const accountNumberSubmitted = String(formData.get("accountNumber") ?? "").trim();
  const accountTypeRaw = String(formData.get("accountType") ?? "").trim();
  const accountType: AccountType | null =
    accountTypeRaw === "CHEQUING" || accountTypeRaw === "SAVINGS" ? accountTypeRaw : null;

  const existingBank = await prisma.vendorBankDetails.findUnique({
    where: { userId: session.userId },
    select: { accountNumber: true },
  });

  const accountNumber =
    accountNumberSubmitted || existingBank?.accountNumber?.trim() || "";

  if (!bankName || !accountName || !accountNumber) {
    redirect("/dashboard/vendor?error=bank_fields_required");
  }

  await prisma.vendorBankDetails.upsert({
    where: { userId: session.userId },
    update: { bankName, accountName, accountNumber, accountType },
    create: { userId: session.userId, bankName, accountName, accountNumber, accountType },
  });

  redirect("/dashboard/vendor?success=bank_saved");
}

export async function requestPayout(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "unauthorized" };

  const amountStr = String(formData.get("amountMinor") ?? "").trim();
  const amountMinor = parseInt(amountStr, 10);

  if (!amountMinor || amountMinor <= 0) {
    return { ok: false, error: "Invalid amount" };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      owner: {
        select: {
          bankDetails: {
            select: { id: true },
          },
        },
      },
      ledgerEntries: {
        select: { amountMinor: true, entryType: true },
      },
      payoutRequests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
  });

  if (!store) return { ok: false, error: "Store not found" };
  if (!store.owner.bankDetails) {
    return { ok: false, error: "Please add your bank details before requesting a payout" };
  }
  if (store.payoutRequests.length > 0) return { ok: false, error: "You already have a pending payout request" };

  const credits = store.ledgerEntries
    .filter((e) => e.entryType === "CREDIT_ORDER_SETTLEMENT")
    .reduce((s, e) => s + e.amountMinor, 0);

  const debits = store.ledgerEntries
    .filter((e) => isVendorBalanceDebit(e.entryType))
    .reduce((s, e) => s + e.amountMinor, 0);

  const availableBalance = credits - debits;

  if (amountMinor > availableBalance) {
    return { ok: false, error: "Amount exceeds available balance" };
  }

  if (amountMinor < 5000) {
    return { ok: false, error: "Minimum payout amount is TTD 50.00" };
  }

  await prisma.payoutRequest.create({
    data: {
      storeId: store.id,
      beneficiaryId: session.userId,
      amountMinor,
      currency: "TTD",
      status: "PENDING",
    },
  });

  revalidatePath("/dashboard/vendor");
  return { ok: true };
}

export async function payMySubscriptionFromBalance(): Promise<
  | { ok: true; charged: boolean; reason?: string }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Not authorized" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: {
      id: true,
      subscriptionPlan: true,
      planRenewsAt: true,
      wipayTrustedCardId: true,
    },
  });
  if (!store) return { ok: false, error: "No store found" };

  if (store.wipayTrustedCardId) {
    return { ok: false, error: "card_subscription_active" };
  }

  const result = await chargeSubscriptionFromBalance(
    store.id,
    store.subscriptionPlan,
    store.planRenewsAt,
  );

  revalidatePath("/dashboard/vendor/finance");

  if (result.ok) {
    return { ok: true, charged: result.charged, reason: result.reason };
  }

  return { ok: false, error: result.reason };
}

export async function startSubscriptionCheckout(
  targetPlan: string,
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Not authorized" };

  const plan = targetPlan === "PRO" ? "PRO" : targetPlan === "GROWTH" ? "GROWTH" : null;
  if (!plan) return { ok: false, error: "Invalid plan" };

  const priceMinor = PLAN_PRICE_MINOR[plan];

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, subscriptionPlan: true, planRenewsAt: true },
  });
  if (!store) return { ok: false, error: "No store found" };
  if (
    store.subscriptionPlan === plan &&
    store.planRenewsAt &&
    store.planRenewsAt.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000
  ) {
    return { ok: false, error: "Renewal opens seven days before your current period ends." };
  }

  try {
    const checkoutUrl = await beginWiPaySubscription({
      userId: session.userId,
      purpose: "VENDOR_SUBSCRIPTION",
      targetId: store.id,
      amountMinor: priceMinor,
      metadata: { targetPlan: plan },
    });
    return { ok: true, checkoutUrl };
  } catch (err) {
    console.error("startSubscriptionCheckout WiPay error:", err);
    return { ok: false, error: "Could not start checkout. Please try again from your dashboard." };
  }
}

export async function startSubscriptionBillingPortal(): Promise<
  { ok: true; portalUrl: string } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { ok: false, error: "Not authorized" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true, subscriptionPlan: true, wipayTrustedCardId: true },
  });
  if (!store?.wipayTrustedCardId || store.subscriptionPlan === "STARTER") {
    return { ok: false, error: "No active card subscription" };
  }

  try {
    const portalUrl = await beginWiPaySubscription({
      userId: session.userId,
      purpose: "VENDOR_SUBSCRIPTION",
      targetId: store.id,
      amountMinor: PLAN_PRICE_MINOR[store.subscriptionPlan],
      metadata: { targetPlan: store.subscriptionPlan, replaceOnly: true },
      forceEnroll: true,
    });
    return { ok: true, portalUrl };
  } catch (err) {
    console.error("startSubscriptionBillingPortal WiPay error:", err);
    return { ok: false, error: "Could not open billing settings. Please try again." };
  }
}
