"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Check, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  confirmOrderPaid,
  createPaymentIntent,
  getCheckoutShippingBreakdown,
  type CheckoutShippingBreakdownResult,
} from "@/app/actions/checkout";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Button from "@/components/ui/Button";
import InlineSpinner from "@/components/ui/InlineSpinner";
import Select from "@/components/ui/Select";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { useCartStore } from "@/lib/cart/cart-store";
import { radius, spacing, tw } from "@/lib/design-system";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export type CheckoutClientItem = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    stock: number | null;
    allowDelivery: boolean;
    allowPickup: boolean;
    deliveryFee: number | null;
    storeId: string;
    isDigital: boolean;
    store: { name: string; slug: string };
    /** When omitted (e.g. older server queries), weight defaults to 0.5 lb in estimates. */
    weight?: number | null;
    weightUnit?: string | null;
  };
};

type CheckoutClientProps = {
  items: CheckoutClientItem[];
  subtotal: number;
};

const mobilePrimaryBtn = `flex w-full min-h-[44px] items-center justify-center ${radius.button} py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${tw.bgScarlet}`;

function PaymentForm({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const setItems = useCartStore((s) => s.setItems);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed");
      setPaying(false);
      return;
    }

    await confirmOrderPaid(orderId);
    setItems([]);
    router.push(`/order-confirmation/${orderId}`);
  }

  return (
    <div className="space-y-4 lg:pb-0 max-lg:pb-24">
      <Button
        className="!px-0 !py-2 min-h-[44px] text-sm text-zinc-500 hover:bg-transparent hover:text-zinc-900"
        type="button"
        variant="ghost"
        onClick={onBack}
      >
        ← Back to delivery details
      </Button>
      <PaymentElement />
      {payError ? <p className={`text-base ${tw.textDangerToken}`}>{payError}</p> : null}
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={paying || !stripe}
        className={`${mobilePrimaryBtn} mt-4 gap-2 lg:static lg:z-auto lg:translate-y-0 max-lg:fixed max-lg:inset-x-3 max-lg:w-auto max-lg:bottom-[calc(var(--mobile-tab-offset)+3.25rem)] max-lg:z-[96]`}
      >
        {paying ? (
          <>
            <InlineSpinner className="h-5 w-5 shrink-0 text-white" />
            Processing…
          </>
        ) : (
          "Pay now"
        )}
      </button>
    </div>
  );
}

export default function CheckoutClient({ items, subtotal }: CheckoutClientProps) {
  const allDigital = useMemo(() => items.every((item) => item.product.isDigital), [items]);
  const anyDelivery = useMemo(() => items.some((i) => i.product.allowDelivery), [items]);
  const anyPickup = useMemo(() => items.some((i) => i.product.allowPickup), [items]);

  const [step, setStep] = useState<"details" | "payment">("details");
  const [deliveryRegion, setDeliveryRegion] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [fulfillmentChoice, setFulfillmentChoice] = useState<"delivery" | "pickup" | null>(() => null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const useDelivery = useMemo(() => {
    if (anyDelivery && !anyPickup) return true;
    if (!anyDelivery && anyPickup) return false;
    if (fulfillmentChoice === "pickup") return false;
    return true;
  }, [anyDelivery, anyPickup, fulfillmentChoice]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regionDetectionFailed, setRegionDetectionFailed] = useState(false);
  const [shippingBreakdown, setShippingBreakdown] =
    useState<CheckoutShippingBreakdownResult | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const regionLabel = deliveryRegion.replace(/_/g, " ");

  const needsShippingQuote = !allDigital && useDelivery && Boolean(deliveryRegion);

  useEffect(() => {
    if (!needsShippingQuote) {
      setShippingBreakdown(null);
      setShippingLoading(false);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);

    void getCheckoutShippingBreakdown(deliveryRegion, useDelivery).then((result) => {
      if (cancelled) return;
      setShippingBreakdown(result);
      setShippingLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [needsShippingQuote, deliveryRegion, useDelivery]);

  const totalShippingMinor = needsShippingQuote && shippingBreakdown?.ok
    ? shippingBreakdown.totalShippingMinor
    : 0;

  const hasCoverageFailure = Boolean(
    needsShippingQuote && shippingBreakdown?.ok && shippingBreakdown.hasCoverageFailure,
  );

  const displayTotal = subtotal + totalShippingMinor / 100;

  const payBlocked =
    loading ||
    (!allDigital && !anyDelivery && !anyPickup) ||
    hasCoverageFailure ||
    (needsShippingQuote && shippingLoading);

  async function proceedToPayment() {
    const addressInput = document.querySelector('input[name="locationAddress"]') as HTMLInputElement | null;
    const latInput = document.querySelector('input[name="locationLat"]') as HTMLInputElement | null;
    const lngInput = document.querySelector('input[name="locationLng"]') as HTMLInputElement | null;
    const address = addressInput?.value ?? "";
    const latRaw = latInput?.value?.trim() ?? "";
    const lngRaw = lngInput?.value?.trim() ?? "";
    const deliveryLat = latRaw ? Number(latRaw) : null;
    const deliveryLng = lngRaw ? Number(lngRaw) : null;

    if (!allDigital && useDelivery && !deliveryRegion) {
      setError("Please select your delivery region.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await createPaymentIntent(
      address,
      allDigital ? "" : deliveryRegion,
      allDigital ? false : useDelivery,
      Number.isFinite(deliveryLat) ? deliveryLat : null,
      Number.isFinite(deliveryLng) ? deliveryLng : null,
      deliveryPhone.trim() || null,
    );
    if (result.ok) {
      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
      setStep("payment");
      setMobileSummaryOpen(false);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function renderShippingLines() {
    if (allDigital) {
      return (
        <div className="flex justify-between py-2 text-sm">
          <span>Delivery</span>
          <span className="font-semibold text-emerald-600">Free — instant download</span>
        </div>
      );
    }

    if (!useDelivery) {
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>Pickup</span>
          <span>Free</span>
        </div>
      );
    }

    if (!deliveryRegion) {
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>Delivery</span>
          <span>Enter address to calculate</span>
        </div>
      );
    }

    if (shippingLoading) {
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>Delivery</span>
          <span className="inline-flex items-center gap-2">
            <InlineSpinner className="size-4" />
            Calculating…
          </span>
        </div>
      );
    }

    if (!shippingBreakdown?.ok) {
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>Delivery</span>
          <span>—</span>
        </div>
      );
    }

    const { perStore } = shippingBreakdown;
    const deliveringStores = perStore.filter((row) => row.deliversToZone);

    if (deliveringStores.length <= 1) {
      const amountMinor = deliveringStores[0]?.shippingMinor ?? 0;
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>Delivery</span>
          <span>TTD {(amountMinor / 100).toFixed(2)}</span>
        </div>
      );
    }

    return (
      <>
        {deliveringStores.map((row) => (
          <div
            key={row.storeId}
            className="flex justify-between py-1.5 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="min-w-0 pr-2">{row.storeName} delivery</span>
            <span className="shrink-0">TTD {(row.shippingMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </>
    );
  }

  const coverageWarning =
    hasCoverageFailure && shippingBreakdown?.ok ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {shippingBreakdown.blockedStores.map((store) => (
          <p key={store.storeId}>
            {store.storeName} doesn&apos;t deliver to {regionLabel}. Remove their items or choose a
            different delivery address.
          </p>
        ))}
      </div>
    ) : null;

  const summaryBody = (
    <>
      <ul className="max-lg:text-sm lg:text-[length:inherit]">
        {items.map((item) => {
          const line = item.product.price * item.quantity;
          return (
            <li key={item.id} className="flex justify-between py-1.5 text-xs" style={{ color: "var(--text-primary)" }}>
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>TTD {line.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
      <div className="my-3 border-t" style={{ borderColor: "var(--card-border-subtle)" }} />
      <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span>Subtotal</span>
        <span>TTD {subtotal.toFixed(2)}</span>
      </div>
      {renderShippingLines()}
      <div className="my-3 border-t" style={{ borderColor: "var(--card-border-subtle)" }} />
      <div className="flex justify-between">
        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Total
        </span>
        <span className="text-base font-bold" style={{ color: "var(--scarlet)" }}>
          TTD {displayTotal.toFixed(2)}
        </span>
      </div>
    </>
  );

  const summaryForDesktop = (
    <>
      <h2 className="mb-3 text-xs font-semibold lg:mb-4 lg:text-sm" style={{ color: "var(--text-primary)" }}>
        Order Summary
      </h2>
      {summaryBody}
    </>
  );

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 ${spacing.cardGap} max-lg:pb-40 lg:pb-0`}>
      <div className="order-1 flex w-full min-w-0 flex-col gap-5 lg:order-none lg:col-span-2">
        {step === "details" ? (
          <div
            className={`${radius.card} bg-white ${spacing.cardPadding}`}
            style={{ border: "1px solid var(--card-border)" }}
          >
            <div id="checkout-delivery-form">
              <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Delivery details
              </h2>

              {!allDigital ? (
                <>
                  {anyDelivery && anyPickup ? (
                    <div className="mt-4 space-y-4">
                      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1">
                        <input
                          type="radio"
                          name="fulfillment"
                          checked={useDelivery}
                          onChange={() => setFulfillmentChoice("delivery")}
                          className="h-5 w-5 shrink-0 border-zinc-300"
                        />
                        <span className="text-base font-medium text-zinc-800">Deliver to my address</span>
                      </label>
                      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1">
                        <input
                          type="radio"
                          name="fulfillment"
                          checked={!useDelivery}
                          onChange={() => setFulfillmentChoice("pickup")}
                          className="h-5 w-5 shrink-0 border-zinc-300"
                        />
                        <span className="text-base font-medium text-zinc-800">Local pickup</span>
                      </label>
                    </div>
                  ) : null}

                  {anyDelivery && !anyPickup ? (
                    <p className="mt-4 text-base text-zinc-600">Delivery to your address</p>
                  ) : null}

                  {!anyDelivery && anyPickup ? (
                    <p className="mt-4 text-base text-zinc-600">Local pickup at the vendor location</p>
                  ) : null}

                  {!anyDelivery && !anyPickup ? (
                    <p className="mt-4 text-base text-amber-700">
                      These products have no delivery or pickup options set. Contact the vendor or try another
                      cart.
                    </p>
                  ) : null}

                  {useDelivery ? (
                    <div className="mt-4 flex flex-col gap-3">
                      {regionDetectionFailed ? (
                        <p className="text-base text-amber-700">
                          We couldn&apos;t detect your region from the map pin. Please choose your delivery region
                          below.
                        </p>
                      ) : null}
                      <Select
                        className={`${radius.card} min-h-[44px] border bg-white px-4 py-3 text-base ${
                          regionDetectionFailed ? "border-amber-400" : "border-zinc-200"
                        }`}
                        label="Select your delivery region"
                        value={deliveryRegion}
                        onChange={(e) => {
                          setDeliveryRegion(e.target.value);
                          setRegionDetectionFailed(false);
                        }}
                      >
                        <option value="">Choose your region...</option>
                        {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>

                      {deliveryRegion ? (
                        <>
                          <Button
                            className="!px-0 !py-2 min-h-[44px] text-sm text-zinc-500 hover:bg-transparent hover:text-zinc-900"
                            type="button"
                            variant="ghost"
                            onClick={() => setDeliveryRegion("")}
                          >
                            ← Change region
                          </Button>

                          <div
                            className={`flex items-center gap-2 ${radius.card} border border-emerald-200 bg-emerald-50 px-3 py-3`}
                          >
                            <Check className="size-5 shrink-0 text-emerald-600" aria-hidden strokeWidth={2.5} />
                            <span className="text-base font-medium capitalize text-emerald-700">
                              {deliveryRegion.replace(/_/g, " ")}
                            </span>
                          </div>

                          <StoreLocationPicker
                            initialAddress=""
                            initialLat={null}
                            initialLng={null}
                            onRegionDetected={(detected) => {
                              if (detected) {
                                setDeliveryRegion(detected);
                                setRegionDetectionFailed(false);
                              } else {
                                setRegionDetectionFailed(true);
                              }
                            }}
                          />
                        </>
                      ) : null}

                      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                        Contact phone (for delivery)
                        <input
                          type="tel"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          placeholder="868 123 4567"
                          className={`${radius.card} min-h-[44px] border border-zinc-200 bg-white px-4 py-3 text-base outline-none ring-zinc-300 focus:ring-2`}
                        />
                      </label>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-4 text-base text-zinc-600">
                  Digital delivery — instant download after payment. No shipping address required.
                </p>
              )}
            </div>

            {coverageWarning ? <div className="mt-4">{coverageWarning}</div> : null}

            <button
              type="button"
              onClick={() => void proceedToPayment()}
              disabled={payBlocked}
              className={`${mobilePrimaryBtn} mt-4 hidden gap-2 lg:flex`}
            >
              {loading ? (
                <>
                  <InlineSpinner className="h-5 w-5 shrink-0 text-white" />
                  Processing…
                </>
              ) : (
                "Continue to payment"
              )}
            </button>
            {error ? <p className={`mt-3 text-base ${tw.textDangerToken}`}>{error}</p> : null}
          </div>
        ) : null}

        {step === "payment" && clientSecret && orderId ? (
          <div
            className={`${radius.card} bg-white ${spacing.cardPadding}`}
            style={{ border: "1px solid var(--card-border)" }}
          >
            <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Payment
            </h2>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm orderId={orderId} onBack={() => setStep("details")} />
            </Elements>
          </div>
        ) : null}
      </div>

      <div className="hidden w-full min-w-0 lg:order-none lg:col-span-1 lg:block">
        <div
          className={`${radius.card} bg-white p-5 lg:sticky lg:top-24`}
          style={{ border: "1px solid var(--card-border)" }}
        >
          {summaryForDesktop}
        </div>
      </div>

      {/* Mobile: sticky dock — order summary toggle + primary CTA */}
      <div className="fixed inset-x-0 bottom-[var(--mobile-tab-offset)] z-[95] lg:hidden safe-area-bottom">
        <div className="border-t border-zinc-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom,0px)]">
          {mobileSummaryOpen ? (
            <div className="max-h-[42vh] overflow-y-auto border-b border-zinc-100 p-4">{summaryBody}</div>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileSummaryOpen((o) => !o)}
            className="flex w-full min-h-[44px] items-center justify-between gap-3 border-zinc-100 px-4 py-2 text-left text-sm font-semibold text-zinc-900"
          >
            <span>
              View order{" "}
              <span style={{ color: "var(--scarlet)" }} className="font-bold">
                (TTD {displayTotal.toFixed(2)})
              </span>
            </span>
            <ChevronUp
              className={`size-5 shrink-0 text-zinc-500 transition-transform ${mobileSummaryOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {step === "details" ? (
            <div className="px-4 pb-2 pt-1">
              <button
                type="button"
                onClick={() => void proceedToPayment()}
                disabled={payBlocked}
                className={`${mobilePrimaryBtn} gap-2`}
              >
                {loading ? (
                  <>
                    <InlineSpinner className="h-5 w-5 shrink-0 text-white" />
                    Processing…
                  </>
                ) : (
                  "Continue to payment"
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
