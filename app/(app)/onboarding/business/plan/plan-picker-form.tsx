"use client";

import { useActionState, useState } from "react";

import Button from "@/components/ui/Button";
import type { PlanPickerOption } from "@/lib/onboarding/plan-picker-options";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";

import { confirmBusinessPlanChoice, type BusinessOnboardingState } from "../actions";

type Props = {
  options: PlanPickerOption[];
  defaultPlan: IntendedPlan;
};

export function BusinessPlanPickerForm({ options, defaultPlan }: Props) {
  const [state, formAction, pending] = useActionState(confirmBusinessPlanChoice, {} as BusinessOnboardingState);
  const [selected, setSelected] = useState<IntendedPlan>(defaultPlan);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-1">
        {options.map((option) => {
          const isSelected = selected === option.planId;
          return (
            <label
              key={option.planId}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? "border-[var(--scarlet)] bg-[#FEF2EE]"
                  : "border-[var(--card-border)] bg-white hover:border-zinc-300"
              } ${option.featured ? "ring-1 ring-[var(--scarlet)]/20" : ""}`}
            >
              <input
                type="radio"
                name="plan"
                value={option.planId}
                checked={isSelected}
                onChange={() => setSelected(option.planId)}
                className="sr-only"
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      {option.name}
                    </p>
                    {option.featured ? (
                      <span className="rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                    {option.tagline}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {option.priceLabel}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {option.priceNote}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <li>{option.productCapLabel}</li>
                <li>{option.aiLabel}</li>
                <li>Commission: {option.commission}</li>
              </ul>
            </label>
          );
        })}
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        You can change plans later from your dashboard. Growth and Pro are billed after your store is set up.
      </p>

      <Button type="submit" fullWidth size="lg" variant="primary" loading={pending}>
        Continue with {options.find((o) => o.planId === selected)?.name ?? "Starter"} →
      </Button>
    </form>
  );
}
