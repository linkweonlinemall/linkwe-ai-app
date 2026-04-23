"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { confirmOrderPaid, createPaymentIntent } from "@/app/actions/checkout";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";
import { useCartStore } from "@/lib/cart/cart-store";
import { getFinalShippingRateForRegion } from "@/lib/shipping/tt-markup";

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
    <div className="space-y-4">
      <Button
        className="!px-0 !py-0 text-sm text-zinc-500 hover:bg-transparent hover:text-zinc-900"
        type="button"
        variant="ghost"
        onClick={onBack}
      >
        ← Back to delivery details
      </Button>
      <PaymentElement />
      {payError ? <p className="text-sm text-red-600">{payError}</p> : null}
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={paying || !stripe}
        className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "var(--scarlet)" }}
      >
        {paying ? "Processing payment..." : "Pay now"}
      </button>
    </div>
  );
}

export default function CheckoutClient({ items, subtotal }: CheckoutClientProps) {
  const anyDelivery = useMemo(() => items.some((i) => i.product.allowDelivery), [items]);
  const anyPickup = useMemo(() => items.some((i) => i.product.allowPickup), [items]);

  const [step, setStep] = useState<"details" | "payment">("details");
  const [deliveryRegion, setDeliveryRegion] = useState("");
  const [useDelivery, setUseDelivery] = useState(() => {
    const anyD = items.some((i) => i.product.allowDelivery);
    const anyP = items.some((i) => i.product.allowPickup);
    if (anyD) return true;
    if (anyP) return false;
    return true;
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regionDetectionFailed, setRegionDetectionFailed] = useState(false);

  useEffect(() => {
    if (anyDelivery && !anyPickup) setUseDelivery(true);
    if (!anyDelivery && anyPickup) setUseDelivery(false);
  }, [anyDelivery, anyPickup]);

  const shippingEstimate =
    useDelivery && deliveryRegion
      ? getFinalShippingRateForRegion(
          deliveryRegion,
          items.reduce((sum, item) => {
            const weightLbs =
              item.product.weight != null
                ? item.product.weightUnit === "KG"
                  ? item.product.weight * 2.20462
                  : item.product.weight
                : 0.5;
            return sum + weightLbs * item.quantity;
          }, 0),
        )
      : 0;

  const displayTotal = subtotal + shippingEstimate;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="order-1 flex w-full min-w-0 flex-col gap-5 lg:order-none lg:col-span-2">
            {step === "details" ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <div id="checkout-delivery-form">
                  <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Delivery details
                  </h2>

                  {anyDelivery && anyPickup ? (
                    <div className="mt-4 space-y-3">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="fulfillment"
                          checked={useDelivery}
                          onChange={() => setUseDelivery(true)}
                          className="border-zinc-300"
                        />
                        <span className="text-sm font-medium text-zinc-800">Deliver to my address</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="fulfillment"
                          checked={!useDelivery}
                          onChange={() => setUseDelivery(false)}
                          className="border-zinc-300"
                        />
                        <span className="text-sm font-medium text-zinc-800">Local pickup</span>
                      </label>
                    </div>
                  ) : null}

                  {anyDelivery && !anyPickup ? (
                    <p className="mt-4 text-sm text-zinc-600">Delivery to your address</p>
                  ) : null}

                  {!anyDelivery && anyPickup ? (
                    <p className="mt-4 text-sm text-zinc-600">Local pickup at the vendor location</p>
                  ) : null}

                  {!anyDelivery && !anyPickup ? (
                    <p className="mt-4 text-sm text-amber-700">
                      These products have no delivery or pickup options set. Contact the vendor or try
                      another cart.
                    </p>
                  ) : null}

                  {useDelivery ? (
                    <div className="mt-4 flex flex-col gap-3">
                      {regionDetectionFailed ? (
                        <p className="text-sm text-amber-700">
                          We couldn&apos;t detect your region from the map pin. Please choose your delivery
                          region below.
                        </p>
                      ) : null}
                      <Select
                        className={`rounded-xl border bg-white px-4 py-3 text-sm ${
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
                            className="!px-0 !py-0 text-sm text-zinc-500 hover:bg-transparent hover:text-zinc-900"
                            type="button"
                            variant="ghost"
                            onClick={() => setDeliveryRegion("")}
                          >
                            ← Change region
                          </Button>

                          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <span className="text-sm text-emerald-500">✓</span>
                            <span className="text-sm font-medium capitalize text-emerald-700">
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
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const addressInput = document.querySelector(
                      'input[name="locationAddress"]',
                    ) as HTMLInputElement | null;
                    const address = addressInput?.value ?? "";

                    if (useDelivery && !deliveryRegion) {
                      setError("Please select your delivery region.");
                      return;
                    }

                    setLoading(true);
                    setError(null);
                    const result = await createPaymentIntent(address, deliveryRegion, useDelivery);
                    if (result.ok) {
                      setClientSecret(result.clientSecret);
                      setOrderId(result.orderId);
                      setStep("payment");
                    } else {
                      setError(result.error);
                    }
                    setLoading(false);
                  }}
                  disabled={loading || (!anyDelivery && !anyPickup)}
                  className="mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  {loading ? "Preparing payment..." : "Continue to payment"}
                </button>
                {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
              </div>
            ) : null}

            {step === "payment" && clientSecret && orderId ? (
              <div
                className="rounded-xl bg-white p-5 sm:p-6"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Payment
                </h2>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm orderId={orderId} onBack={() => setStep("details")} />
                </Elements>
              </div>
            ) : null}
          </div>

          <div className="order-last w-full min-w-0 lg:order-none lg:col-span-1">
            <div
              className="rounded-xl bg-white p-5 lg:sticky lg:top-24"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Order Summary
              </h2>
              <ul>
                {items.map((item) => {
                  const line = item.product.price * item.quantity;
                  return (
                    <li
                      key={item.id}
                      className="flex justify-between py-1.5 text-xs"
                      style={{ color: "var(--text-primary)" }}
                    >
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
              <div className="flex justify-between py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span>{useDelivery ? "Delivery" : "Pickup"}</span>
                <span>
                  {useDelivery
                    ? deliveryRegion
                      ? `TTD ${shippingEstimate.toFixed(2)}`
                      : "Enter address to calculate"
                    : "Free"}
                </span>
              </div>
              <div className="my-3 border-t" style={{ borderColor: "var(--card-border-subtle)" }} />
              <div className="flex justify-between">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Total
                </span>
                <span className="text-base font-bold" style={{ color: "var(--scarlet)" }}>
                  TTD {displayTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
  );
}
