"use client";

import { useEffect, useState } from "react";

import { getDockBayData, getWarehouseBayStats } from "@/app/actions/admin-bays";

type Bay = Awaited<ReturnType<typeof getDockBayData>>[number];
type Stats = Awaited<ReturnType<typeof getWarehouseBayStats>>;

function relativeTime(date: Date | string | null): string {
  if (!date) return "";
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function BayMapTab() {
  const [bays, setBays] = useState<Bay[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [baysLoading, setBaysLoading] = useState(true);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setBaysLoading(true);

    getDockBayData()
      .then((b) => {
        setBays(b);
        console.log("Bays loaded:", b.length);
      })
      .catch((err) => {
        console.error("getDockBayData failed:", err);
        setBays([]);
      })
      .finally(() => {
        setBaysLoading(false);
      });

    getWarehouseBayStats()
      .then(setStats)
      .catch((err) => {
        console.error("getWarehouseBayStats failed:", err);
      });
  }, [refreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Dock Bay Map
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Warehouse dock — 20 bays · auto-refreshes every 30s
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-zinc-50"
          style={{
            borderColor: "var(--card-border)",
            color: "var(--text-secondary)",
          }}
        >
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {(
          [
            {
              label: "Total Bays",
              value: stats?.total ?? 20,
              color: "var(--text-primary)",
              bg: "#F7F7F6",
            },
            {
              label: "Occupied",
              value: stats?.occupied ?? 0,
              color: "#D4450A",
              bg: "#FEF2EE",
            },
            {
              label: "Available",
              value: stats?.available ?? 20,
              color: "#15803D",
              bg: "#DCFCE7",
            },
          ] as const
        ).map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: card.bg,
              border: "1px solid var(--card-border-subtle)",
            }}
          >
            <p className="text-3xl font-bold" style={{ color: card.color }}>
              {card.value}
            </p>
            <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {baysLoading ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl"
              style={{
                height: 100,
                backgroundColor: "#F0F0F0",
                border: "1px solid var(--card-border-subtle)",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bays.map((bay) => {
            const isSelected = selectedBay === bay.bayNumber;
            const occupied = bay.isOccupied && bay.splitOrder;

            return (
              <button
                type="button"
                key={bay.bayNumber}
                onClick={() => setSelectedBay(isSelected ? null : bay.bayNumber)}
                className="relative rounded-xl p-3 text-left transition-all duration-200 hover:shadow-md"
                style={{
                  backgroundColor: occupied
                    ? isSelected
                      ? "#FEE2E2"
                      : "#FEF2EE"
                    : isSelected
                      ? "#DCFCE7"
                      : "#F7F7F6",
                  border: isSelected
                    ? `2px solid ${occupied ? "#D4450A" : "#15803D"}`
                    : `1px solid ${occupied ? "#FBB9A5" : "var(--card-border-subtle)"}`,
                  minHeight: 100,
                  width: "100%",
                }}
              >
                <div
                  className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: occupied ? "#D4450A" : "#E4E4E7",
                    color: occupied ? "white" : "var(--text-muted)",
                  }}
                >
                  {bay.bayNumber}
                </div>

                {occupied && bay.splitOrder ? (
                  <div>
                    <p
                      className="truncate text-xs font-semibold leading-tight"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {bay.splitOrder.store?.name ?? "Unknown"}
                    </p>
                    <p
                      className="mt-0.5 truncate font-mono text-[11px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {bay.splitOrder.referenceNumber ?? bay.splitOrder.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-1 text-[11px]" style={{ color: "#E8820C" }}>
                      {bay.assignedAt ? relativeTime(bay.assignedAt) : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-medium" style={{ color: "#15803D" }}>
                    Available
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!baysLoading && bays.length === 0 ? (
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
          No dock bays in the database. Run{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npx prisma db seed</code> to create
          20 bays.
        </p>
      ) : null}

      {selectedBay !== null
        ? (() => {
            const bay = bays.find((b) => b.bayNumber === selectedBay);
            if (!bay) return null;

            return (
              <div
                className="rounded-xl p-5"
                style={{ border: "1px solid var(--card-border)", backgroundColor: "white" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Bay #{bay.bayNumber} Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedBay(null)}
                    className="text-xs"
                    style={{ color: "var(--text-faint)" }}
                  >
                    Close ×
                  </button>
                </div>

                {bay.isOccupied && bay.splitOrder ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Vendor
                      </p>
                      <p style={{ color: "var(--text-primary)" }}>{bay.splitOrder.store?.name}</p>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Split Order
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                        {bay.splitOrder.referenceNumber}
                      </p>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Main Order
                      </p>
                      <p className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
                        {bay.splitOrder.mainOrder?.referenceNumber}
                      </p>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Customer
                      </p>
                      <p style={{ color: "var(--text-primary)" }}>{bay.splitOrder.mainOrder?.buyer?.fullName}</p>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Status
                      </p>
                      <p style={{ color: "var(--text-primary)" }}>
                        {String(bay.splitOrder.status).replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p
                        className="mb-1 text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Time in bay
                      </p>
                      <p style={{ color: "#E8820C" }}>{bay.assignedAt ? relativeTime(bay.assignedAt) : "—"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="mb-2 text-2xl">✅</p>
                    <p className="text-sm font-medium" style={{ color: "#15803D" }}>
                      Bay #{bay.bayNumber} is available
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      Ready to receive the next order
                    </p>
                  </div>
                )}
              </div>
            );
          })()
        : null}
    </div>
  );
}
