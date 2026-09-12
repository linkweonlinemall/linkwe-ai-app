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
    <ul className="flex flex-col gap-3 font-sans text-sm text-zinc-600">
      <li className={`flex items-start gap-3 ${deliveryMuted ? "opacity-55" : ""}`}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-[#1A7FB5]"><Truck className="size-4" strokeWidth={2} aria-hidden /></span>
        <span>
          Delivery available
          {allowDelivery ? deliveryFeeSuffix ?? "" : " — Not offered for this item"}
        </span>
      </li>
      <li className={`flex items-start gap-3 ${pickupMuted ? "opacity-55" : ""}`}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#D4450A]"><MapPin className="size-4" strokeWidth={2} aria-hidden /></span>
        <span>
          Local pickup available
          {!allowPickup ? " — Not offered by this seller" : ""}
        </span>
      </li>
      <li className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Lock className="size-4" strokeWidth={2} aria-hidden /></span>
        <span>Secure checkout via WiPay</span>
      </li>
    </ul>
  );
}
