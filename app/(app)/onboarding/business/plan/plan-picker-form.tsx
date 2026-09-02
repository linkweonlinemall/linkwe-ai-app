"use client";

import { useActionState, useState } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";

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
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">Choose your business plan</legend>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {options.map((option) => {
          const isSelected = selected === option.planId;
          return (
            <label
              key={option.planId}
              className="relative min-w-0 cursor-pointer"
            >
              <input
                type="radio"
                name="plan"
                value={option.planId}
                checked={isSelected}
                onChange={() => setSelected(option.planId)}
                className="peer sr-only"
                aria-describedby={`plan-${option.planId}-details`}
              />
              <div className={`flex h-full min-w-0 flex-col rounded-2xl border-2 p-5 transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none peer-focus-visible:ring-2 peer-focus-visible:ring-orange-600 peer-focus-visible:ring-offset-4 ${isSelected ? "border-[#D4450A] bg-[#FFF8F3] shadow-lg shadow-orange-900/10" : "border-zinc-200 bg-white hover:border-orange-300"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-bold text-zinc-900">
                      {option.name}
                    </p>
                    {option.featured ? (
                      <span className="rounded-full bg-[#D4450A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {option.tagline}
                  </p>
                </div>
                <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#D4450A] bg-[#D4450A] text-white" : "border-zinc-300"}`}>
                  {isSelected ? <Check size={15} strokeWidth={3} /> : null}
                </span>
              </div>
                <div className="my-5 min-w-0 border-b border-zinc-200/80 pb-5 lg:min-h-24">
                  <p className="text-3xl font-bold tracking-tight text-zinc-900">
                    {option.priceLabel}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {option.priceNote}
                  </p>
                </div>
              <ul id={`plan-${option.planId}-details`} className="space-y-3 text-sm leading-relaxed text-zinc-700">
                {[option.productCapLabel, option.aiLabel, ...option.commission.split(" · ")].map((feature) => (
                  <li key={feature} className="flex min-w-0 items-start gap-2"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#D4450A]" /><span className="min-w-0 break-words">{feature}</span></li>
                ))}
              </ul>
              <span className={`mt-auto flex items-center justify-center gap-2 rounded-xl px-3 py-3 pt-3 text-sm font-semibold ${isSelected ? "text-[#B83A09]" : "text-zinc-500"}`}>
                {isSelected ? "Selected plan" : `Choose ${option.name}`}
              </span>
              </div>
            </label>
          );
        })}
      </div>
      </fieldset>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
      <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-zinc-600 sm:mb-0 sm:max-w-md">
        <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#D4450A]" />
        <span>
        You can change plans later from your dashboard. Growth and Pro are billed after your store is set up.
        </span></p>

      <Button type="submit" size="lg" variant="primary" loading={pending} className="min-h-12 w-full rounded-xl sm:w-auto sm:shrink-0">
        Continue with {options.find((o) => o.planId === selected)?.name ?? "Starter"} <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Button>
      </div>
    </form>
  );
}
