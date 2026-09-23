"use client";
/* Staff image previews accept vendor-hosted URLs before saving; do not proxy them through the public image optimizer. */
/* eslint-disable @next/next/no-img-element */
import { useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Upload,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { compressAndUploadImages } from "@/lib/images/upload-images-client";
import { uploadAdminRecordImages } from "@/app/actions/admin-records";
import { humanLabel } from "@/lib/admin/record-design";
import type { CheckoutField } from "@/lib/checkout/custom-fields";

export function MediaEditor({
  value,
  onChange,
  single = false,
  label,
  onBusy,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  single?: boolean;
  label: string;
  onBusy?: (busy: boolean) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [url, setUrl] = useState("");
  const urls = single
    ? value
      ? [String(value)]
      : []
    : Array.isArray(value)
      ? (value as string[])
      : [];
  function change(next: string[]) {
    onChange(single ? next[0] || null : next);
  }
  async function upload(files: File[]) {
    setBusy(true);
    onBusy?.(true);
    try {
      const result = await compressAndUploadImages(
        files.slice(0, single ? 1 : Math.max(0, 20 - urls.length)),
        uploadAdminRecordImages,
        { onProgress: (done, total) => setProgress(`${done} of ${total}`) },
      );
      if (result.urls.length)
        change(single ? result.urls : [...urls, ...result.urls]);
      if (result.error) toast.error(result.error);
    } finally {
      setBusy(false);
      onBusy?.(false);
      setProgress("");
    }
  }
  return (
    <div className="space-y-3">
      <div className="admin-media-grid">
        {urls.map((src, index) => (
          <div className="admin-media-item" key={`${src}-${index}`}>
            <img src={src} alt={`${label} ${index + 1}`} loading="lazy" />
            <div className="admin-media-actions">
              {!single ? (
                <>
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Move image ${index + 1} earlier`}
                    onClick={() => {
                      const next = [...urls];
                      [next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ];
                      change(next);
                    }}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[9px] text-zinc-500">
                    {index === 0 ? "COVER" : index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={busy || index === urls.length - 1}
                    aria-label={`Move image ${index + 1} later`}
                    onClick={() => {
                      const next = [...urls];
                      [next[index], next[index + 1]] = [
                        next[index + 1],
                        next[index],
                      ];
                      change(next);
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <span className="pl-2 text-[10px] text-zinc-500">
                  Current image
                </span>
              )}
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove image ${index + 1}`}
                onClick={() => change(urls.filter((_, i) => i !== index))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <label className="admin-upload" htmlFor={id}>
        <Upload size={18} />
        <span>
          {busy
            ? `Uploading ${progress}…`
            : urls.length && single
              ? "Replace image"
              : "Upload photographs"}
          <small className="mt-1 block text-[10px] text-zinc-500">
            JPG, PNG or WebP · automatically optimised
          </small>
        </span>
        <input
          id={id}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={!single}
          disabled={busy || (!single && urls.length >= 20)}
          onChange={(e) => {
            if (e.target.files) void upload(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </label>
      <details>
        <summary className="min-h-8 cursor-pointer text-[11px] text-zinc-500">
          Use an existing image link
        </summary>
        <div className="admin-inline-fields mt-2">
          <input
            className="admin-input"
            type="url"
            aria-label={`${label} URL`}
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            className="admin-button"
            disabled={busy || !url.trim() || (!single && urls.length >= 20)}
            onClick={() => {
              try {
                const parsed = new URL(url);
                if (!["http:", "https:"].includes(parsed.protocol))
                  throw new Error();
                change(single ? [url.trim()] : [...urls, url.trim()]);
                setUrl("");
              } catch {
                toast.error("Enter a valid image URL.");
              }
            }}
          >
            <ImagePlus size={15} />
            Add image
          </button>
        </div>
      </details>
    </div>
  );
}
export function StringListEditor({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (v: string[]) => void;
  label: string;
}) {
  const [entry, setEntry] = useState("");
  const rows = Array.isArray(value) ? value.map(String) : [];
  function add() {
    const next = entry
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (next.length) {
      onChange([...new Set([...rows, ...next])]);
      setEntry("");
    }
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {rows.map((row, index) => (
          <span
            key={`${row}-${index}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#edf4f2] px-3 py-1.5 text-xs text-[#3d6157]"
          >
            {row}
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center"
              aria-label={`Remove ${row}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <div className="admin-inline-fields">
        <input
          className="admin-input"
          value={entry}
          aria-label={`Add ${label.toLowerCase()}`}
          placeholder="Type an entry, then add"
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="admin-button"
          disabled={!entry.trim()}
          onClick={add}
        >
          <Plus size={16} />
          Add
        </button>
      </div>
    </div>
  );
}
export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
type Day = {
  closed: boolean;
  allDay: boolean;
  slots: { from: string; to: string }[];
};
export function HoursEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const hours =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, Day>)
      : {};
  const update = (day: string, next: Day | undefined) => {
    const updated = { ...hours };
    if (next) updated[day] = next;
    else delete updated[day];
    onChange(Object.keys(updated).length ? updated : null);
  };
  return (
    <div>
      {DAYS.map((day) => {
        const entry = hours[day];
        const mode = !entry
          ? "unset"
          : entry.closed
            ? "closed"
            : entry.allDay
              ? "all"
              : "hours";
        return (
          <div key={day} className="admin-hours-day">
            <strong>{humanLabel(day)}</strong>
            <div className="admin-hours-slots">
              <select
                className="admin-input"
                aria-label={`${humanLabel(day)} opening status`}
                value={mode}
                onChange={(e) =>
                  update(
                    day,
                    e.target.value === "unset"
                      ? undefined
                      : {
                          closed: e.target.value === "closed",
                          allDay: e.target.value === "all",
                          slots:
                            e.target.value === "hours"
                              ? [{ from: "09:00", to: "17:00" }]
                              : [],
                        },
                  )
                }
              >
                <option value="unset">Not set</option>
                <option value="closed">Closed</option>
                <option value="all">Open 24 hours</option>
                <option value="hours">Set opening hours</option>
              </select>
              {mode === "hours" && (
                <>
                  {(entry.slots || []).map((slot, index) => (
                    <div key={index} className="admin-inline-fields">
                      <input
                        className="admin-input"
                        type="time"
                        aria-label={`${day} opening time ${index + 1}`}
                        value={slot.from}
                        onChange={(e) =>
                          update(day, {
                            ...entry,
                            slots: entry.slots.map((s, i) =>
                              i === index ? { ...s, from: e.target.value } : s,
                            ),
                          })
                        }
                      />
                      <span className="text-xs text-zinc-400">to</span>
                      <input
                        className="admin-input"
                        type="time"
                        aria-label={`${day} closing time ${index + 1}`}
                        value={slot.to}
                        onChange={(e) =>
                          update(day, {
                            ...entry,
                            slots: entry.slots.map((s, i) =>
                              i === index ? { ...s, to: e.target.value } : s,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="admin-icon-button"
                        aria-label={`Remove ${day} time range ${index + 1}`}
                        onClick={() =>
                          update(day, {
                            ...entry,
                            slots: entry.slots.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="admin-button self-start"
                    type="button"
                    onClick={() =>
                      update(day, {
                        ...entry,
                        slots: [...(entry.slots || []), { from: "", to: "" }],
                      })
                    }
                  >
                    <Plus size={14} />
                    Add a time range
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function SocialEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const links = (value || {}) as Record<string, string>;
  return (
    <div className="admin-form-grid">
      {[
        "website",
        "whatsapp",
        "instagram",
        "facebook",
        "tiktok",
        "youtube",
        "linkedin",
        "x",
      ].map((key) => (
        <label className="admin-field" key={key}>
          <span className="admin-field-label">
            {key === "x" ? "X / Twitter" : humanLabel(key)}
          </span>
          <input
            className="admin-input"
            value={links[key] || ""}
            placeholder={
              key === "whatsapp"
                ? "Phone number or WhatsApp link"
                : key === "website"
                  ? "https://your-business.com"
                  : "Profile link or @handle"
            }
            onChange={(e) => onChange({ ...links, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
export function QuestionsEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const rows = Array.isArray(value) ? (value as CheckoutField[]) : [];
  function update(i: number, patch: Partial<CheckoutField>) {
    onChange(
      rows.map((row, index) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  return (
    <div>
      {!rows.length && (
        <p className="admin-muted mb-4">
          No extra questions. Add one if the customer needs to provide a size,
          custom message, file or other detail.
        </p>
      )}
      {rows.map((row, index) => (
        <div className="admin-row-editor" key={row.id}>
          <div className="admin-row-head">
            <span>Question {index + 1}</span>
            <button
              className="admin-icon-button"
              type="button"
              aria-label={`Remove question ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span className="admin-field-label">Question</span>
              <input
                className="admin-input"
                value={row.label}
                maxLength={120}
                onChange={(e) => update(index, { label: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field-label">Answer type</span>
              <select
                className="admin-input"
                value={row.type}
                onChange={(e) =>
                  update(index, {
                    type: e.target.value as CheckoutField["type"],
                  })
                }
              >
                {["text", "select", "multiselect", "upload", "checklist"].map(
                  (type) => (
                    <option key={type} value={type}>
                      {
                        {
                          text: "Written answer",
                          select: "Choose one",
                          multiselect: "Choose several",
                          upload: "Upload a file",
                          checklist: "Checklist",
                        }[type]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
            {["select", "multiselect", "checklist"].includes(row.type) && (
              <label className="admin-field admin-full">
                <span className="admin-field-label">
                  Options · one per line
                </span>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={row.options.join("\n")}
                  onChange={(e) =>
                    update(index, { options: e.target.value.split("\n") })
                  }
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={row.required}
                onChange={(e) => update(index, { required: e.target.checked })}
                className="h-4 w-4 accent-orange-600"
              />
              An answer is required
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="admin-button"
        disabled={rows.length >= 20}
        onClick={() =>
          onChange([
            ...rows,
            {
              id: crypto.randomUUID(),
              label: "",
              type: "text",
              required: false,
              options: [],
            },
          ])
        }
      >
        <Plus size={16} />
        Add a customer question
      </button>
    </div>
  );
}
export function PropertiesEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const pairs =
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value)
      : [];
  const [key, setKey] = useState("");
  return (
    <div className="space-y-2">
      {pairs.map(([key, val]) => (
        <div className="admin-inline-fields" key={key}>
          <span className="min-w-20 text-xs">{humanLabel(key)}</span>
          {typeof val === "boolean" ? (
            <input
              type="checkbox"
              checked={val}
              aria-label={key}
              onChange={(e) =>
                onChange({ ...(value as object), [key]: e.target.checked })
              }
            />
          ) : typeof val === "object" && val !== null ? (
            <span className="admin-muted flex-1">
              Structured information retained
            </span>
          ) : (
            <input
              className="admin-input"
              aria-label={key}
              type={typeof val === "number" ? "number" : "text"}
              value={String(val ?? "")}
              onChange={(e) =>
                onChange({
                  ...(value as object),
                  [key]:
                    typeof val === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          )}
          <button
            type="button"
            className="admin-icon-button"
            aria-label={`Remove ${key}`}
            onClick={() =>
              onChange(Object.fromEntries(pairs.filter(([k]) => k !== key)))
            }
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="admin-inline-fields">
        <input
          className="admin-input"
          placeholder="Property name, e.g. colour"
          aria-label="New property name"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button
          type="button"
          className="admin-button"
          disabled={!key.trim() || pairs.some(([k]) => k === key.trim())}
          onClick={() => {
            if (["__proto__", "constructor", "prototype"].includes(key.trim()))
              return;
            onChange({ ...(value as object), [key.trim()]: "" });
            setKey("");
          }}
        >
          <Plus size={15} />
          Add property
        </button>
      </div>
    </div>
  );
}
export function BankEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const data = (value || {}) as Record<string, string>;
  return (
    <div className="admin-form-grid">
      {["bankName", "accountName", "accountNumber"].map((key) => (
        <label className="admin-field" key={key}>
          <span className="admin-field-label">{humanLabel(key)}</span>
          <input
            className="admin-input"
            autoComplete="off"
            value={data[key] || ""}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="admin-field">
        <span className="admin-field-label">Account type</span>
        <select
          className="admin-input"
          value={data.accountType || ""}
          onChange={(e) => onChange({ ...data, accountType: e.target.value })}
        >
          <option value="">Not specified</option>
          <option value="SAVINGS">Savings</option>
          <option value="CHEQUING">Chequing</option>
        </select>
      </label>
    </div>
  );
}
export type EditorVariant = {
  id?: string;
  name: string;
  sku?: string | null;
  price?: number | string | null;
  stock?: number | string | null;
  images: string[];
  attributes: Record<string, string>;
};
export function VariantsEditor({
  value,
  onChange,
  onBusy,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  onBusy: (v: boolean) => void;
}) {
  const rows = Array.isArray(value) ? (value as EditorVariant[]) : [];
  const update = (index: number, patch: Partial<EditorVariant>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div>
      <p className="admin-muted mb-4">
        Leave a variation price blank to use the main price. To retire an
        existing variation, set its stock to zero; its identity stays intact.
      </p>
      {rows.map((row, index) => (
        <div className="admin-row-editor" key={row.id || index}>
          <div className="admin-row-head">
            <span>{row.name || `Variation ${index + 1}`}</span>
            {!row.id && (
              <button
                type="button"
                className="admin-icon-button"
                aria-label={`Remove variation ${index + 1}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="admin-form-grid">
            {["name", "sku", "price", "stock"].map((key) => (
              <label className="admin-field" key={key}>
                <span className="admin-field-label">{humanLabel(key)}</span>
                <input
                  className="admin-input"
                  type={["price", "stock"].includes(key) ? "number" : "text"}
                  min={0}
                  step={key === "stock" ? 1 : "0.01"}
                  value={String(row[key as keyof EditorVariant] ?? "")}
                  onChange={(e) => update(index, { [key]: e.target.value })}
                />
              </label>
            ))}
            <div className="admin-field admin-full">
              <span className="admin-field-label">
                Options · for example size or colour
              </span>
              <PropertiesEditor
                value={row.attributes}
                onChange={(v) =>
                  update(index, { attributes: v as Record<string, string> })
                }
              />
            </div>
            <details className="admin-full">
              <summary className="cursor-pointer py-2 text-xs text-zinc-500">
                Variation photographs · {row.images.length}
              </summary>
              <MediaEditor
                label={`Variation ${index + 1}`}
                value={row.images}
                onChange={(v) => update(index, { images: v as string[] })}
                onBusy={onBusy}
              />
            </details>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="admin-button"
        disabled={rows.length >= 100}
        onClick={() =>
          onChange([
            ...rows,
            {
              name: "",
              sku: "",
              price: "",
              stock: "",
              images: [],
              attributes: {},
            },
          ])
        }
      >
        <Plus size={16} />
        Add a variation
      </button>
    </div>
  );
}
