"use client";

import { useState, useTransition } from "react";
import {
  createTicketType,
  updateTicketType,
  deleteTicketType,
  publishEvent,
} from "@/app/actions/events";
import { formatEventDateCompact } from "@/lib/events/format-datetime";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SerializedTicketType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  quantitySold: number;
  description: string | null;
  perks: string | null;
  saleStartDate: string | null;
  saleEnds: string | null;
  maxPerOrder: number;
  isVisible: boolean;
  color: string | null;
};

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { label: "Scarlet", value: "#D4450A" },
  { label: "Amber", value: "#E8820C" },
  { label: "Blue", value: "#1A7FB5" },
  { label: "Green", value: "#15803D" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Grey", value: "#6B7280" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : formatEventDateCompact(d);
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16);
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-[#D4450A]" : "bg-zinc-200"}`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
      <span className="text-sm text-zinc-700">{label}</span>
    </div>
  );
}

// ─── TicketForm ───────────────────────────────────────────────────────────────

function TicketForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initial?: Partial<SerializedTicketType>;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [isVisible, setIsVisible] = useState(initial?.isVisible ?? true);
  const [selectedColor, setSelectedColor] = useState<string | null>(initial?.color ?? null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("isVisible", isVisible.toString());
    if (selectedColor) fd.set("color", selectedColor);
    else fd.delete("color");
    onSubmit(fd);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Name <span className="text-[#D4450A]">*</span>
          </label>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="e.g. General Admission, VIP, Early Bird"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Price (TTD) <span className="text-[#D4450A]">*</span>
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initial?.price ?? ""}
            placeholder="0.00"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Quantity available <span className="text-[#D4450A]">*</span>
          </label>
          <input
            name="quantity"
            type="number"
            min="1"
            required
            defaultValue={initial?.quantity ?? ""}
            placeholder="e.g. 200"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Max per order</label>
          <input
            name="maxPerOrder"
            type="number"
            min="1"
            defaultValue={initial?.maxPerOrder ?? 10}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Description</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
          placeholder="Short description of this ticket tier"
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Perks / What&apos;s included
        </label>
        <textarea
          name="perks"
          rows={2}
          defaultValue={initial?.perks ?? ""}
          placeholder="e.g. Open bar, VIP lounge access, reserved seating..."
          className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Sale starts</label>
          <input
            name="saleStartDate"
            type="datetime-local"
            defaultValue={toDatetimeLocal(initial?.saleStartDate)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">Sale ends</label>
          <input
            name="saleEnds"
            type="datetime-local"
            defaultValue={toDatetimeLocal(initial?.saleEnds)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm focus:border-[#D4450A] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold text-zinc-700">Colour label</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setSelectedColor(selectedColor === c.value ? null : c.value)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                selectedColor === c.value ? "scale-110 border-zinc-900" : "border-transparent"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
          {selectedColor && (
            <button
              type="button"
              onClick={() => setSelectedColor(null)}
              className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <Toggle value={isVisible} onChange={setIsVisible} label="Visible to customers" />

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#D4450A" }}
        >
          {isPending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── TicketTypesClient ────────────────────────────────────────────────────────

export function TicketTypesClient({
  eventId,
  eventStatus,
  initialTicketTypes,
}: {
  eventId: string;
  eventStatus: string;
  initialTicketTypes: SerializedTicketType[];
}) {
  const [isPending, startTransition] = useTransition();
  const [ticketTypes, setTicketTypes] = useState<SerializedTicketType[]>(initialTicketTypes);
  const [status, setStatus] = useState(eventStatus);
  const [actionError, setActionError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      setActionError(null);
      const result = await createTicketType(eventId, formData);
      if ("error" in result) {
        setActionError(result.error);
      } else {
        setShowAddForm(false);
        // Optimistically append; full refresh on next render
        window.location.reload();
      }
    });
  }

  function handleUpdate(ticketTypeId: string, formData: FormData) {
    startTransition(async () => {
      setActionError(null);
      const result = await updateTicketType(ticketTypeId, formData);
      if ("error" in result) {
        setActionError(result.error);
      } else {
        setEditingId(null);
        window.location.reload();
      }
    });
  }

  function handleDelete(ticketTypeId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      setActionError(null);
      const result = await deleteTicketType(ticketTypeId);
      if ("error" in result) {
        setActionError(result.error);
      } else {
        setTicketTypes((prev) => prev.filter((t) => t.id !== ticketTypeId));
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      setPublishError(null);
      setPublishSuccess(false);
      const result = await publishEvent(eventId);
      if ("error" in result) {
        setPublishError(result.error);
      } else {
        setPublishSuccess(true);
        setStatus("PUBLISHED");
      }
    });
  }

  const totalQty = ticketTypes.reduce((s, t) => s + t.quantity, 0);
  const totalSold = ticketTypes.reduce((s, t) => s + t.quantitySold, 0);
  const totalRevenue = ticketTypes.reduce((s, t) => s + t.price * t.quantitySold, 0);

  return (
    <>
      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      {/* Ticket types list */}
      <div className="mb-6 flex flex-col gap-4">
        {ticketTypes.length === 0 && !showAddForm && (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">No ticket types yet</p>
            <p className="mt-1 text-xs text-zinc-400">
              Add at least one ticket type before publishing
            </p>
          </div>
        )}

        {ticketTypes.map((tt) =>
          editingId === tt.id ? (
            <div key={tt.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Editing: {tt.name}
              </p>
              <TicketForm
                initial={tt}
                onSubmit={(fd) => handleUpdate(tt.id, fd)}
                onCancel={() => setEditingId(null)}
                isPending={isPending}
                submitLabel="Save changes"
              />
            </div>
          ) : (
            <div
              key={tt.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {tt.color && (
                    <div
                      className="h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: tt.color }}
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{tt.name}</p>
                      {!tt.isVisible && (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 text-sm font-bold"
                      style={{ color: "var(--scarlet)" }}
                    >
                      TTD {tt.price.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditingId(tt.id); setShowAddForm(false); }}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={tt.quantitySold > 0 || isPending}
                    onClick={() => handleDelete(tt.id, tt.name)}
                    title={tt.quantitySold > 0 ? "Cannot delete — tickets sold" : "Delete"}
                    className="text-xs font-medium text-red-400 hover:text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 sm:grid-cols-4">
                <span>
                  Sold: <strong className="text-zinc-800">{tt.quantitySold}</strong> / {tt.quantity}
                </span>
                <span>
                  Max/order: <strong className="text-zinc-800">{tt.maxPerOrder}</strong>
                </span>
                {tt.saleStartDate && (
                  <span>
                    Sale from: <strong className="text-zinc-800">{fmtDate(tt.saleStartDate)}</strong>
                  </span>
                )}
                {tt.saleEnds && (
                  <span>
                    Sale ends: <strong className="text-zinc-800">{fmtDate(tt.saleEnds)}</strong>
                  </span>
                )}
              </div>

              {tt.perks && (
                <p className="mt-2 text-xs text-zinc-500">
                  <span className="font-semibold">Perks:</span> {tt.perks}
                </p>
              )}
            </div>
          )
        )}

        {showAddForm && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              New ticket type
            </p>
            <TicketForm
              onSubmit={handleCreate}
              onCancel={() => setShowAddForm(false)}
              isPending={isPending}
              submitLabel="Add ticket type"
            />
          </div>
        )}
      </div>

      {/* Add button */}
      {!showAddForm && editingId === null && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          + Add ticket type
        </button>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-900">{totalQty}</p>
          <p className="text-xs text-zinc-500">Total capacity</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-900">{totalSold}</p>
          <p className="text-xs text-zinc-500">Tickets sold</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: "var(--scarlet)" }}>
            TTD {totalRevenue.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-500">Revenue</p>
        </div>
      </div>

      {/* Publish */}
      {publishError && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {publishError}
        </div>
      )}
      {publishSuccess && (
        <div className="mb-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Event published! It is now visible to customers.
        </div>
      )}

      {status !== "PUBLISHED" && (
        <button
          type="button"
          disabled={isPending || ticketTypes.length === 0}
          onClick={handlePublish}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ backgroundColor: "#D4450A" }}
        >
          {isPending ? "Publishing..." : "Publish event"}
        </button>
      )}

      {status === "PUBLISHED" && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-center">
          <p className="text-sm font-semibold text-green-800">✓ This event is live</p>
          <p className="mt-1 text-xs text-green-700">Customers can now find and buy tickets.</p>
        </div>
      )}
    </>
  );
}
