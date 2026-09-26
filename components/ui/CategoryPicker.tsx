"use client";

import React, { useState } from "react";

import { STORE_CATEGORY_GROUPS as GROUPS } from "@/lib/onboarding/store-categories";

type Props = {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
};

export default function CategoryPicker({ name, value = "", onChange }: Props) {
  const [selected, setSelected] = useState(value);

  function select(val: string) {
    setSelected(val);
    onChange?.(val);
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-3 gap-2">
        {GROUPS.map((group, gi) => (
          <React.Fragment key={`group-${gi}`}>
            <p
              className={`col-span-3 text-[10px] uppercase tracking-wider mb-1 ${gi === 0 ? "mt-0" : "mt-3"}`}
              style={{ color: "var(--text-muted)" }}
            >
              {group.group}
            </p>
            {group.items.map((item) => {
              const isSelected = selected === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => select(item.value)}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? "border-[#D4450A] bg-[#D4450A]/5"
                      : "border-transparent bg-white hover:border-[#D4450A]/30 hover:bg-[#D4450A]/5"
                  }`}
                  style={{ border: isSelected ? undefined : "1px solid var(--card-border)" }}
                >
                  <span className="text-2xl leading-none">{item.emoji}</span>
                  <span className={`text-xs font-medium leading-tight ${isSelected ? "text-[#D4450A]" : "text-[#1C1C1A]"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
