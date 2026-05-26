import { Lock, MapPin, Truck } from "lucide-react";

export default function ProductTrustSignals({
  allowPickup,
  allowDelivery,
  deliveryFeeSuffix,
}: {
  allowPickup: boolean;
  allowDelivery: boolean;
  /** Text appended after "Delivery available" (e.g. " — TTD 12.00") */
  deliveryFeeSuffix?: string | null;
}) {
  const deliveryMuted = !allowDelivery;
  const pickupMuted = !allowPickup;

  return (
    <ul className="flex flex-col gap-2 font-sans text-sm text-zinc-600">
      <li className={`flex items-start gap-2 ${deliveryMuted ? "opacity-60" : ""}`}>
        <Truck className="mt-0.5 size-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
        <span>
          Delivery available
          {allowDelivery ? deliveryFeeSuffix ?? "" : " — Not offered for this item"}
        </span>
      </li>
      <li className={`flex items-start gap-2 ${pickupMuted ? "opacity-60" : ""}`}>
        <MapPin className="mt-0.5 size-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
        <span>
          Local pickup available
          {!allowPickup ? " — Not offered by this seller" : ""}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <Lock className="mt-0.5 size-4 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
        <span>Secure checkout via Stripe</span>
      </li>
    </ul>
  );
}
