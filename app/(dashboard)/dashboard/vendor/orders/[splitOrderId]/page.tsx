import { chooseCourierPickup, chooseVendorDropoff } from "@/app/actions/fulfillment";
import { getSession } from "@/lib/auth/session";
import { getCourierPickupFee } from "@/lib/fulfillment/courier-pickup-rates";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ splitOrderId: string }> };

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return { label: "Action Required", className: "bg-red-50 text-red-700 border border-red-200" };
    case "VENDOR_PREPARING":
      return { label: "Preparing", className: "bg-amber-50 text-amber-700 border border-amber-200" };
    case "AWAITING_COURIER_PICKUP":
      return { label: "Awaiting Courier", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_ASSIGNED":
      return { label: "Courier Assigned", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "COURIER_PICKED_UP":
      return { label: "Courier Picked Up", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "VENDOR_DROPPED_OFF":
      return { label: "Dropped Off", className: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "AT_WAREHOUSE":
      return { label: "At Warehouse", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "BUNDLED_FOR_DISPATCH":
      return { label: "Bundled for dispatch", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DISPATCHED":
      return { label: "Dispatched", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    case "DELIVERED":
      return { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    default:
      return { label: status, className: "bg-zinc-100 text-zinc-600 border border-zinc-200" };
  }
}

function formatRegion(region: string): string {
  return region.replace(/_/g, " ");
}

function statusMeaning(status: string): string {
  switch (status) {
    case "AWAITING_VENDOR_ACTION":
      return "You need to choose how you will get items to the warehouse.";
    case "VENDOR_PREPARING":
      return "You chose drop-off and are preparing items for the warehouse.";
    case "AWAITING_COURIER_PICKUP":
      return "A courier will collect your items from your store location.";
    case "COURIER_ASSIGNED":
      return "A courier has been assigned to this pickup.";
    case "COURIER_PICKED_UP":
      return "The courier has collected your items.";
    case "VENDOR_DROPPED_OFF":
      return "Items have been dropped off for warehouse intake.";
    case "AT_WAREHOUSE":
      return "Items are checked in at the LinkWe warehouse.";
    case "BUNDLED_FOR_DISPATCH":
      return "Your part of the order is bundled for outbound shipping.";
    case "DISPATCHED":
      return "Items have left the warehouse for delivery.";
    case "DELIVERED":
      return "This split order is complete.";
    default:
      return "This order is being processed.";
  }
}

export default async function VendorFulfillmentSplitOrderPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR") redirect("/");

  const { splitOrderId } = await params;

  const splitOrder = await prisma.splitOrder.findFirst({
    where: {
      id: splitOrderId,
      store: { ownerId: session.userId },
    },
    include: {
      items: true,
      inboundShipment: {
        include: {
          courier: {
            select: { fullName: true, region: true },
          },
        },
      },
      mainOrder: {
        select: {
          id: true,
          region: true,
          shippingZone: true,
          buyer: { select: { fullName: true } },
        },
      },
      store: {
        select: { name: true, region: true, address: true },
      },
    },
  });

  if (!splitOrder) redirect("/dashboard/vendor");

  const badge = getStatusBadge(splitOrder.status);
  const orderRef = `LW-${splitOrder.mainOrderId.slice(-8).toUpperCase()}`;
  const totalUnits = splitOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  const showCourierCard = [
    "COURIER_ASSIGNED",
    "COURIER_PICKED_UP",
    "VENDOR_DROPPED_OFF",
    "AT_WAREHOUSE",
    "BUNDLED_FOR_DISPATCH",
    "DISPATCHED",
    "DELIVERED",
  ].includes(splitOrder.status);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/dashboard/vendor#orders"
          className="text-sm font-medium text-zinc-600 hover:text-[#D4450A]"
        >
          ← Back to orders
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-900">Fulfill Order #{orderRef}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Order details</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">Customer</dt>
                <dd className="font-medium text-zinc-900">{splitOrder.mainOrder.buyer.fullName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Delivery region</dt>
                <dd className="font-medium capitalize text-zinc-900">{formatRegion(splitOrder.mainOrder.region)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Items count</dt>
                <dd className="font-medium text-zinc-900">
                  {splitOrder.items.length} line{splitOrder.items.length === 1 ? "" : "s"} ({totalUnits} unit
                  {totalUnits === 1 ? "" : "s"})
                </dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              {splitOrder.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm text-zinc-700">
                  <span>
                    {item.titleSnapshot} × {item.quantity}
                  </span>
                  <span className="text-zinc-600">TTD {(item.unitPriceMinor / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-zinc-100 pt-4 text-sm font-semibold text-zinc-900">
              Order value: TTD {(splitOrder.subtotalMinor / 100).toFixed(2)}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Choose fulfillment method</p>

              {splitOrder.status === "AWAITING_VENDOR_ACTION" ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form action={chooseVendorDropoff}>
                  <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border-2 border-zinc-200 bg-white p-4 text-left transition-colors hover:border-[#D4450A]"
                  >
                    <p className="text-sm font-semibold text-zinc-900">Drop off at warehouse</p>
                    <p className="mt-1 text-xs text-zinc-500">Bring your items to the LinkWe warehouse yourself.</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-600">Free — no fee</p>
                  </button>
                </form>

                <form action={chooseCourierPickup}>
                  <input type="hidden" name="splitOrderId" value={splitOrder.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl border-2 border-zinc-200 bg-white p-4 text-left transition-colors hover:border-[#D4450A]"
                  >
                    <p className="text-sm font-semibold text-zinc-900">Request courier pickup</p>
                    <p className="mt-1 text-xs text-zinc-500">A LinkWe courier will collect your items.</p>
                    <p className="mt-2 text-xs font-semibold text-amber-600">
                      TTD {getCourierPickupFee(splitOrder.store.region ?? "").toFixed(2)} pickup fee — deducted from
                      earnings
                    </p>
                  </button>
                </form>
              </div>
              ) : (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-sm font-medium text-zinc-900">{badge.label}</p>
                  <p className="mt-2 text-sm text-zinc-600">{statusMeaning(splitOrder.status)}</p>
                  <p className="mt-4 text-sm text-zinc-500">No action required at this time.</p>
                </div>
              )}
            </div>

            {showCourierCard && splitOrder.inboundShipment?.courier ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Assigned Courier
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200">
                    <span className="text-sm font-bold text-zinc-600">
                      {splitOrder.inboundShipment.courier.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {splitOrder.inboundShipment.courier.fullName}
                    </p>
                    <p className="text-xs capitalize text-zinc-500">
                      {splitOrder.inboundShipment.courier.region?.replace(/_/g, " ") ?? ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
