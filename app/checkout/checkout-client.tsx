"use client";

import { Check, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createPaymentIntent,
  getCheckoutShippingBreakdown,
  type CheckoutShippingBreakdownResult,
} from "@/app/actions/checkout";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Button from "@/components/ui/Button";
import InlineSpinner from "@/components/ui/InlineSpinner";
import Select from "@/components/ui/Select";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { radius, spacing, tw } from "@/lib/design-system";
import { normalizeTTPhone } from "@/lib/phone";

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
  initialPhone?: string;
};

const mobilePrimaryBtn = `flex w-full min-h-[44px] items-center justify-center ${radius.button} py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${tw.bgScarlet}`;

function getRegionOptionLabel(slug: string): string {
  const match = TRINIDAD_ONBOARDING_REGION_OPTIONS.find((r) => r.value === slug);
  return match?.label ?? slug.replace(/_/g, " ");
}

function localPhoneDisplay(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1868")) digits = digits.slice(4);
  else if (digits.startsWith("868") && digits.length > 7) digits = digits.slice(3);
  digits = digits.slice(0, 7);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

export default function CheckoutClient({ items, subtotal, initialPhone = "" }: CheckoutClientProps) {
  const allDigital = useMemo(() => items.every((item) => item.product.isDigital), [items]);
  const anyDelivery = useMemo(() => items.some((i) => i.product.allowDelivery), [items]);
  const anyPickup = useMemo(() => items.some((i) => i.product.allowPickup), [items]);

  const step = "details" as const;
  const [deliveryRegion, setDeliveryRegion] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState(() => localPhoneDisplay(initialPhone));
  const [fulfillmentChoice, setFulfillmentChoice] = useState<"delivery" | "pickup" | null>(() => null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const useDelivery = useMemo(() => {
    if (anyDelivery && !anyPickup) return true;
    if (!anyDelivery && anyPickup) return false;
    if (fulfillmentChoice === "pickup") return false;
    return true;
  }, [anyDelivery, anyPickup, fulfillmentChoice]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Pin-derived region; the map location is authoritative for delivery pricing. */
  const [suggestedRegion, setSuggestedRegion] = useState<string | null>(null);
  /** Pin/address geocode could not match any known delivery area. */
  const [pinRegionUnmatched, setPinRegionUnmatched] = useState(false);
  /** Blocks payment until pin suggestion is reconciled with deliveryRegion. */
  const [regionNeedsConfirmation, setRegionNeedsConfirmation] = useState(false);
  const [shippingBreakdown, setShippingBreakdown] =
    useState<CheckoutShippingBreakdownResult | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  const regionLabel = deliveryRegion.replace(/_/g, " ");

  useEffect(() => {
    if (!useDelivery || allDigital) {
      setSuggestedRegion(null);
      setPinRegionUnmatched(false);
      setRegionNeedsConfirmation(false);
    }
  }, [useDelivery, allDigital]);

  function handlePinRegionDetected(detected: string | null) {
    if (detected) {
      setSuggestedRegion(detected);
      setDeliveryRegion(detected);
      setPinRegionUnmatched(false);
      setRegionNeedsConfirmation(false);
      return;
    }
    setSuggestedRegion(null);
    setPinRegionUnmatched(true);
    setRegionNeedsConfirmation(true);
  }

  function handleDeliveryRegionChange(nextRegion: string) {
    setDeliveryRegion(nextRegion);
    setPinRegionUnmatched(false);
    if (suggestedRegion) {
      setRegionNeedsConfirmation(suggestedRegion !== nextRegion);
    } else {
      setRegionNeedsConfirmation(false);
    }
  }

  function clearDeliveryRegionSelection() {
    setDeliveryRegion("");
    setSuggestedRegion(null);
    setPinRegionUnmatched(false);
    setRegionNeedsConfirmation(false);
  }

  function confirmCurrentDeliveryRegion() {
    setPinRegionUnmatched(false);
    setRegionNeedsConfirmation(false);
  }

  function acceptSuggestedRegion() {
    if (!suggestedRegion) return;
    setDeliveryRegion(suggestedRegion);
    setRegionNeedsConfirmation(false);
  }

  function keepCurrentDeliveryRegion() {
    setSuggestedRegion(null);
    setRegionNeedsConfirmation(false);
  }

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

  const needsRegionConfirmation = !allDigital && useDelivery && regionNeedsConfirmation;
  const deliveryPhoneValid = !useDelivery || allDigital || normalizeTTPhone(deliveryPhone).ok;

  const payBlocked =
    loading ||
    (!allDigital && !anyDelivery && !anyPickup) ||
    hasCoverageFailure ||
    !deliveryPhoneValid ||
    needsRegionConfirmation ||
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

    if (!allDigital && useDelivery && !address.trim()) {
      setError("Please enter or pin your delivery location.");
      return;
    }

    if (!allDigital && useDelivery && regionNeedsConfirmation) {
      setError("Please confirm your delivery region matches your pin location before continuing.");
      return;
    }
    if (!allDigital && useDelivery && !deliveryPhoneValid) {
      setError("Enter a valid 7-digit Trinidad & Tobago phone number.");
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
      window.location.assign(result.checkoutUrl);
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
      const store = deliveringStores[0];
      const amountMinor = store?.shippingMinor ?? 0;
      return (
        <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span>{store?.isDigitalOnly ? "Digital delivery" : "Delivery"}</span>
          <span className={store?.isDigitalOnly ? "font-semibold text-emerald-600" : undefined}>
            {store?.isDigitalOnly ? "Free" : `TTD ${(amountMinor / 100).toFixed(2)}`}
          </span>
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
            <span className="min-w-0 pr-2">
              {row.isDigitalOnly ? "Digital delivery" : `${row.storeName} delivery`}
            </span>
            <span
              className={
                row.isDigitalOnly ? "shrink-0 font-semibold text-emerald-600" : "shrink-0"
              }
            >
              {row.isDigitalOnly ? "Free" : `TTD ${(row.shippingMinor / 100).toFixed(2)}`}
            </span>
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
                      <Select
                        className={`${radius.card} min-h-[44px] border bg-white px-4 py-3 text-base ${
                          regionNeedsConfirmation ? "border-amber-400" : "border-zinc-200"
                        }`}
                        label="Select your delivery region"
                        value={deliveryRegion}
                        onChange={(e) => handleDeliveryRegionChange(e.target.value)}
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
                            onClick={clearDeliveryRegionSelection}
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
                            onRegionDetected={handlePinRegionDetected}
                          />

                          {suggestedRegion && suggestedRegion === deliveryRegion ? (
                            <p className="text-sm text-emerald-700">
                              ✓ Pin matches your selected region: {getRegionOptionLabel(suggestedRegion)}
                            </p>
                          ) : null}

                          {suggestedRegion && suggestedRegion !== deliveryRegion ? (
                            <div
                              className={`${radius.card} border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900`}
                            >
                              <p>
                                Your pin looks like it&apos;s in{" "}
                                <span className="font-semibold">{getRegionOptionLabel(suggestedRegion)}</span>, but
                                you selected{" "}
                                <span className="font-semibold">{getRegionOptionLabel(deliveryRegion)}</span>.
                                Which is correct?
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={acceptSuggestedRegion}
                                  className={`min-h-[44px] ${radius.button} bg-[#D4450A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90`}
                                >
                                  Use {getRegionOptionLabel(suggestedRegion)}
                                </button>
                                <button
                                  type="button"
                                  onClick={keepCurrentDeliveryRegion}
                                  className={`min-h-[44px] ${radius.button} border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50`}
                                >
                                  Keep {getRegionOptionLabel(deliveryRegion)}
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {pinRegionUnmatched ? (
                            <div
                              className={`${radius.card} border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900`}
                            >
                              <p>
                                We couldn&apos;t match your pin to a delivery area. Please confirm your region
                                below.
                              </p>
                              <button
                                type="button"
                                onClick={confirmCurrentDeliveryRegion}
                                className={`mt-3 min-h-[44px] ${radius.button} border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50`}
                              >
                                Confirm {getRegionOptionLabel(deliveryRegion)}
                              </button>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                        Contact phone (for delivery)
                        <div className="flex min-w-0"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-500">+1 (868)</span><input
                          type="tel"
                          value={deliveryPhone}
                          required
                          inputMode="numeric"
                          minLength={7}
                          maxLength={8}
                          pattern="[0-9]{3}-?[0-9]{4}"
                          onChange={(e) => setDeliveryPhone(localPhoneDisplay(e.target.value))}
                          placeholder="XXX-XXXX"
                          className="min-h-[44px] min-w-0 flex-1 rounded-r-xl border border-l-0 border-zinc-200 bg-white px-3 py-3 text-base outline-none ring-zinc-300 focus:ring-2"
                        /></div>
                        {!deliveryPhoneValid ? <span className="text-xs font-normal text-red-600">Enter a valid 7-digit Trinidad & Tobago number.</span> : null}
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

            {needsRegionConfirmation ? (
              <p className="mt-4 text-base text-amber-700">
                Please confirm your delivery region matches your pin location before continuing.
              </p>
            ) : null}

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
              {needsRegionConfirmation ? (
                <p className="mb-2 text-sm text-amber-700">
                  Confirm your delivery region before continuing.
                </p>
              ) : null}
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
