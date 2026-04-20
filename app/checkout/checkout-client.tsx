"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { confirmOrderPaid, createPaymentIntent } from "@/app/actions/checkout";
import StoreLocationPicker from "@/components/storefront/StoreLocationPicker";
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
      <button type="button" onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Back to delivery details
      </button>
      <PaymentElement />
      {payError ? <p className="text-sm text-red-600">{payError}</p> : null}
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={paying || !stripe}
        className="h-12 w-full rounded-xl text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#D4450A" }}
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
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {step === "details" ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div id="checkout-delivery-form">
              <h2 className="text-lg font-semibold text-zinc-900">Delivery details</h2>

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
                  These products have no delivery or pickup options set. Contact the vendor or try another
                  cart.
                </p>
              ) : null}

              {useDelivery ? (
                <div className="mt-4 flex flex-col gap-3">
                  <label className="text-sm font-medium text-zinc-800">Select your delivery region</label>
                  <select
                    value={deliveryRegion}
                    onChange={(e) => setDeliveryRegion(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2"
                  >
                    <option value="">Choose your region...</option>
                    {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {deliveryRegion ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setDeliveryRegion("")}
                        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
                      >
                        ← Change region
                      </button>

                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <span className="text-sm text-emerald-500">✓</span>
                        <span className="text-sm font-medium capitalize text-emerald-700">
                          {deliveryRegion.replace(/_/g, " ")}
                        </span>
                      </div>

                      <StoreLocationPicker initialAddress="" initialLat={null} initialLng={null} />
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
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#D4450A" }}
            >
              {loading ? "Preparing payment..." : "Continue to payment"}
            </button>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>
        ) : null}

        {step === "payment" && clientSecret && orderId ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm orderId={orderId} onBack={() => setStep("details")} />
            </Elements>
          </div>
        ) : null}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => {
              const line = item.product.price * item.quantity;
              return (
                <li key={item.id} className="text-sm">
                  <p className="font-medium text-zinc-900">{item.product.name}</p>
                  <p className="text-zinc-600">
                    {item.quantity} × TTD {item.product.price.toFixed(2)}
                  </p>
                  <p className="font-medium text-zinc-900">TTD {line.toFixed(2)}</p>
                </li>
              );
            })}
          </ul>
          <hr className="my-4 border-zinc-100" />
          <div className="flex justify-between text-sm text-zinc-600">
            <span>Subtotal</span>
            <span>TTD {subtotal.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-zinc-500">{useDelivery ? "Delivery" : "Pickup"}</span>
            <span className="font-medium text-zinc-900">
              {useDelivery
                ? deliveryRegion
                  ? `TTD ${shippingEstimate.toFixed(2)}`
                  : "Enter address to calculate"
                : "Free"}
            </span>
          </div>
          <hr className="my-4 border-zinc-100" />
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>TTD {displayTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
