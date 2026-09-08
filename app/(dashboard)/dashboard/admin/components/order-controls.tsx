"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getOperationsWorkspace, updateWarehouseOrder } from "@/app/actions/admin-operations";
import { cancelOrders, completeAllDeliveredSplits, confirmPendingPayment } from "@/app/actions/admin-orders";

type WarehouseAction = Parameters<typeof updateWarehouseOrder>[0]["action"];
type Operation = WarehouseAction | "complete" | "cancel" | "confirm_payment";
type Split = { id: string; referenceNumber: string | null; status: string; store: { name: string } };

const LABELS: Record<Operation, string> = {
  note: "Add staff note",
  confirm_payment: "Confirm sandbox payment",
  prepare: "Set vendor as preparing",
  receive: "Receive vendor parcel",
  move_bay: "Move parcel to another bay",
  book_collection: "Record collection booking",
  pack: "Combine and pack all parcels",
  pickup_ready: "Ready for customer pickup",
  dispatch: "Dispatch customer order",
  deliver: "Confirm delivery or pickup",
  complete: "Complete and release earnings",
  cancel: "Cancel order",
};

const RECEIVABLE = ["AWAITING_VENDOR_ACTION", "PREPARING", "VENDOR_PREPARING", "AWAITING_COURIER_PICKUP", "COURIER_ASSIGNED", "COURIER_PICKED_UP", "VENDOR_DROPPED_OFF", "READY_FOR_LINKWE"];
const IN_BAY = ["AT_WAREHOUSE", "PACKAGED", "READY_FOR_CUSTOMER_PICKUP"];
const CANCELLABLE = ["PAID", "PROCESSING", "PARTIALLY_IN_HOUSE", "READY_TO_SHIP", "PACKING_COMPLETE"];

function availableActions(status: string, splits: Split[], sandboxPayment: boolean, hasShippingAddress: boolean): Operation[] {
  const result: Operation[] = ["note"];
  if (status === "PENDING_PAYMENT" && sandboxPayment) result.push("confirm_payment");
  if (splits.some((split) => ["AWAITING_VENDOR_ACTION", "PREPARING"].includes(split.status))) result.push("prepare");
  if (splits.some((split) => RECEIVABLE.includes(split.status))) result.push("receive");
  if (splits.some((split) => split.status === "AWAITING_COURIER_PICKUP")) result.push("book_collection");
  if (splits.some((split) => IN_BAY.includes(split.status))) result.push("move_bay");
  if (splits.length > 0 && splits.every((split) => split.status === "AT_WAREHOUSE")) result.push("pack");
  if (splits.length > 0 && splits.every((split) => split.status === "PACKAGED")) result.push(hasShippingAddress ? "dispatch" : "pickup_ready");
  if (splits.length > 0 && splits.every((split) => ["OUT_FOR_DELIVERY", "READY_FOR_CUSTOMER_PICKUP"].includes(split.status))) result.push("deliver");
  if (["DELIVERED", "CUSTOMER_RECEIVED"].includes(status)) result.push("complete");
  if (CANCELLABLE.includes(status)) result.push("cancel");
  return result;
}

function eligibleSplits(action: Operation, splits: Split[]): Split[] {
  if (action === "prepare") return splits.filter((split) => ["AWAITING_VENDOR_ACTION", "PREPARING"].includes(split.status));
  if (action === "receive") return splits.filter((split) => RECEIVABLE.includes(split.status));
  if (action === "book_collection") return splits.filter((split) => split.status === "AWAITING_COURIER_PICKUP");
  if (action === "move_bay") return splits.filter((split) => IN_BAY.includes(split.status));
  return splits;
}

export default function OrderControls({
  orderId,
  status,
  splits,
  sandboxPayment,
  hasShippingAddress,
  onRefresh,
}: {
  orderId: string;
  status: string;
  splits: Split[];
  sandboxPayment: boolean;
  hasShippingAddress: boolean;
  onRefresh: () => void;
}) {
  const options = availableActions(status, splits, sandboxPayment, hasShippingAddress);
  const [action, setAction] = useState<Operation>(options[0] ?? "note");
  const [splitId, setSplitId] = useState(splits[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [bay, setBay] = useState("");
  const [busy, setBusy] = useState(false);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [warehouseId, setWarehouseId] = useState("");

  useEffect(() => {
    if (!options.includes(action)) setAction(options[0] ?? "note");
  }, [action, options]);

  useEffect(() => {
    if (action !== "pack") return;
    getOperationsWorkspace()
      .then((data) => setWarehouses(data.warehouses))
      .catch(() => toast.error("Could not load warehouses."));
  }, [action]);

  const selectableSplits = eligibleSplits(action, splits);
  const effectiveSplitId = selectableSplits.some((split) => split.id === splitId)
    ? splitId
    : selectableSplits[0]?.id ?? "";
  const needsSplit = ["prepare", "receive", "move_bay", "book_collection"].includes(action);
  const needsNote = ["note", "confirm_payment", "deliver", "cancel"].includes(action);
  const input = "min-h-11 min-w-0 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#D4450A] focus:ring-2 focus:ring-[#D4450A]/10";

  return (
    <section className="my-4 rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-zinc-950">Manage order</h3>
        <p className="mt-1 text-xs text-zinc-500">Only valid next actions are shown. Current status: {status.replaceAll("_", " ").toLowerCase()}.</p>
      </div>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        const warning = action === "complete"
          ? "This releases vendor earnings and cannot be undone here."
          : action === "cancel"
            ? "The order will stop. Any refund must be handled separately."
            : "This updates operational records and may notify customers or vendors.";
        if (!window.confirm(`${LABELS[action]}?\n${warning}`)) return;
        setBusy(true);
        try {
          if (action === "cancel") {
            const result = await cancelOrders([orderId], note);
            if (!result.cancelled) throw new Error("This order can no longer be cancelled safely.");
          } else if (action === "complete") {
            const result = await completeAllDeliveredSplits(orderId);
            if (!result.ok) throw new Error(result.error);
            if (!result.completed) throw new Error("No delivered vendor parcels are awaiting completion.");
          } else if (action === "confirm_payment") {
            const result = await confirmPendingPayment(orderId, note);
            if (!result.ok) throw new Error(result.error);
          } else {
            const result = await updateWarehouseOrder({
              orderId,
              action,
              splitId: needsSplit ? effectiveSplitId : undefined,
              note,
              reference,
              bay: bay ? Number(bay) : undefined,
              warehouseId: warehouseId || warehouses[0]?.id,
            });
            if (!result.ok) throw new Error(result.error);
          }
          toast.success(`${LABELS[action]} saved.`);
          setNote("");
          setReference("");
          setBay("");
          onRefresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not update this order.");
        } finally {
          setBusy(false);
        }
      }}>
        <label className="text-xs font-semibold text-zinc-600">
          Next action
          <select className={`${input} mt-1`} value={action} onChange={(event) => setAction(event.target.value as Operation)}>
            {options.map((value) => <option key={value} value={value}>{LABELS[value]}</option>)}
          </select>
        </label>

        {needsSplit ? (
          <label className="text-xs font-semibold text-zinc-600">
            Vendor parcel
            <select className={`${input} mt-1`} value={effectiveSplitId} onChange={(event) => setSplitId(event.target.value)} required>
              {selectableSplits.map((split) => <option value={split.id} key={split.id}>{split.store.name} · {split.referenceNumber ?? split.id} · {split.status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
        ) : null}

        {["receive", "move_bay"].includes(action) ? (
          <label className="text-xs font-semibold text-zinc-600">
            Bay number {action === "receive" ? "(optional)" : ""}
            <input className={`${input} mt-1`} aria-label="Bay number" required={action === "move_bay"} placeholder="e.g. 4" type="number" min={1} max={9999} value={bay} onChange={(event) => setBay(event.target.value)} />
          </label>
        ) : null}

        {["book_collection", "dispatch"].includes(action) ? (
          <label className="text-xs font-semibold text-zinc-600">
            CSF reference
            <input className={`${input} mt-1`} required maxLength={120} placeholder="Paste tracking reference" value={reference} onChange={(event) => setReference(event.target.value)} />
          </label>
        ) : null}

        {action === "pack" ? (
          <label className="text-xs font-semibold text-zinc-600">
            Warehouse
            <select className={`${input} mt-1`} value={warehouseId || warehouses[0]?.id || ""} onChange={(event) => setWarehouseId(event.target.value)} required>
              <option value="" disabled>Choose warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
          </label>
        ) : null}

        {needsNote ? (
          <label className="text-xs font-semibold text-zinc-600 sm:col-span-2">
            {action === "deliver" ? "Delivery evidence" : action === "confirm_payment" ? "Sandbox confirmation note" : "Staff note / reason"}
            <textarea required maxLength={2000} rows={3} placeholder="Record what happened and why" className={`${input} mt-1`} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        ) : null}

        <button disabled={busy || (needsSplit && !effectiveSplitId)} className="min-h-11 rounded-xl bg-[#D4450A] px-4 text-sm font-semibold text-white transition hover:bg-[#B83A09] disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? "Saving…" : "Review and apply"}
        </button>
      </form>
    </section>
  );
}
