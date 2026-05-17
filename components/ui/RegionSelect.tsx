"use client";

import type { ChangeEvent } from "react";

import { TT_REGION_GROUPS } from "@/lib/regions/tt-regions";

type Props = {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  label?: string;
  error?: string;
};

export default function RegionSelect({
  name,
  value,
  defaultValue,
  onChange,
  required,
  label,
  error,
}: Props) {
  const controlled = value !== undefined;
  const selectProps = controlled
    ? {
        value,
        onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
      }
    : {
        defaultValue: defaultValue ?? "",
        onChange: onChange
          ? (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)
          : undefined,
      };

  return (
    <div>
      {label ? (
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          {label} {required ? <span className="text-[#D4450A]">*</span> : null}
        </label>
      ) : null}
      <select
        name={name}
        required={required}
        className={`w-full rounded-xl border bg-zinc-50 px-3.5 py-2.5 text-sm focus:bg-white focus:outline-none ${
          error ? "border-red-400 focus:border-red-400" : "border-zinc-200 focus:border-[#D4450A]"
        }`}
        {...selectProps}
      >
        <option value="">Select a region...</option>
        {TT_REGION_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.regions.map((r, idx) => (
              <option key={`${group.label}-${r.value}-${idx}`} value={r.value}>
                {r.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
