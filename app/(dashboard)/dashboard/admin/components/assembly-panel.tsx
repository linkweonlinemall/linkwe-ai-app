"use client";

import { bundleAndDispatch, markPackaged } from "@/app/actions/assembly";

type SplitOrderSummary = {
  id: string;
  referenceNumber: string | null;
  status: string;
  subtotalMinor: number;
  packagedAt: Date | string | null;
  store: { name: string };
};

type Props = {
  mainOrderId: string;
  mainOrderRef: string | null;
  customerName: string;
  deliveryRegion: string;
  splitOrders: SplitOrderSummary[];
};

function formatTTD(minor: number): string {
  return (minor / 100).toLocaleString("en-TT", {
    style: "currency",
    currency: "TTD",
  });
}

export default function AssemblyPanel({
  mainOrderId,
  mainOrderRef,
  customerName,
  deliveryRegion,
  splitOrders,
}: Props) {
  const allPackaged = splitOrders.every((so) =>
    ["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status),
  );

  const packedCount = splitOrders.filter((so) =>
    ["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status),
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            Pack order {mainOrderRef ?? mainOrderId.slice(-8).toUpperCase()}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {customerName} · {deliveryRegion?.replace(/_/g, " ")} · {packedCount}/{splitOrders.length} packed
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {splitOrders.map((so) => {
            const isPacked = ["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status);
            return (
              <div
                key={so.id}
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: isPacked ? "#1B8C5A" : "#E4E4E7" }}
                title={so.store.name}
              />
            );
          })}
        </div>
      </div>

      <div className="divide-y divide-zinc-100">
        {splitOrders.map((so) => {
          const isPacked = ["PACKAGED", "BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status);
          const isDispatched = ["BUNDLED_FOR_DISPATCH", "DISPATCHED"].includes(so.status);

          return (
            <div key={so.id} className="flex items-center gap-4 px-4 py-3">
              {isDispatched ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-emerald-500 bg-emerald-500">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <form action={markPackaged}>
                  <input type="hidden" name="splitOrderId" value={so.id} />
                  <button
                    type="submit"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      isPacked
                        ? "border-emerald-500 bg-emerald-500 hover:border-emerald-600 hover:bg-emerald-600"
                        : "border-zinc-300 bg-white hover:border-[#D4450A]"
                    }`}
                    title={isPacked ? "Click to unpack" : "Click to mark as packed"}
                  >
                    {isPacked ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </button>
                </form>
              )}

              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isPacked ? "text-zinc-400 line-through" : "text-zinc-900"}`}>
                  {so.store.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {so.referenceNumber ?? so.id.slice(-8)} · {formatTTD(so.subtotalMinor)}
                  {so.packagedAt && isPacked ? (
                    <span className="ml-2 text-emerald-500">
                      Packed at{" "}
                      {new Date(so.packagedAt).toLocaleTimeString("en-TT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : null}
                </p>
              </div>

              <span className={`shrink-0 text-xs font-medium ${isPacked ? "text-emerald-600" : "text-zinc-400"}`}>
                {isPacked ? "✓ Packed" : "Needs packing"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3">
        <p className="text-xs text-zinc-500">
          {allPackaged
            ? "All packed — seal the box and dispatch."
            : `${splitOrders.length - packedCount} more to pack`}
        </p>
        <form action={bundleAndDispatch}>
          <input type="hidden" name="mainOrderId" value={mainOrderId} />
          <button
            type="submit"
            disabled={!allPackaged}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ backgroundColor: allPackaged ? "#1B8C5A" : "#9CA3AF" }}
          >
            Bundle & Dispatch →
          </button>
        </form>
      </div>
    </div>
  );
}
