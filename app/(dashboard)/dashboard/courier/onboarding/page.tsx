"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  readCourierOnboardingBootstrap,
  saveCourierOnboardingStep,
  type CourierOnboardingBootstrap,
  type CourierOnboardingFormState,
} from "@/app/actions/courier";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";

const VEHICLE_TYPES = ["Car", "Motorcycle", "Van", "Truck"] as const;

export default function CourierDashboardOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootstrap, setBootstrap] = useState<CourierOnboardingBootstrap | null | undefined>(undefined);
  const [state, formAction] = useActionState(saveCourierOnboardingStep, {} as CourierOnboardingFormState);

  useEffect(() => {
    readCourierOnboardingBootstrap().then((b) => {
      if (!b) {
        router.replace("/login");
        return;
      }
      if (b.courierOnboardingStep >= 2) {
        router.replace("/dashboard/courier");
        return;
      }
      setBootstrap(b);
    });
  }, [router]);

  const urlStep = searchParams.get("step") === "2" ? 2 : 1;

  const expectedStep =
    bootstrap === undefined || bootstrap === null ? 1 : bootstrap.courierOnboardingStep < 1 ? 1 : 2;

  useEffect(() => {
    if (bootstrap === undefined || bootstrap === null) return;
    if (urlStep !== expectedStep) {
      router.replace(`/dashboard/courier/onboarding?step=${expectedStep}`);
    }
  }, [bootstrap, expectedStep, router, urlStep]);

  if (bootstrap === undefined) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        <div className="mx-auto flex min-h-[40vh] w-full max-w-2xl items-center justify-center px-4 py-10 text-sm text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  if (bootstrap === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div
          className="rounded-xl bg-white p-6 sm:p-8"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <p className="text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Step {urlStep} of 2
          </p>
          <h1 className="mt-2 text-center text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Courier setup
          </h1>
          <p className="mt-1 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            Tell us how you will operate on LinkWe. You can update details later when profile settings ship.
          </p>

          {urlStep === 1 ? (
            <form className="mt-6 flex flex-col gap-4" action={formAction} key="courier-onboarding-step-1">
              <input name="step" type="hidden" value="1" />
              <input name="userId" type="hidden" value={bootstrap.id} />

              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                Vehicle type
                <select
                  required
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
                  name="vehicleType"
                >
                  <option value="">Select…</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-normal text-zinc-500">
                  Your vehicle details will be saved to your courier profile when that feature is ready.
                </span>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                Operating region
                <select
                  required
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
                  defaultValue={bootstrap.region ?? ""}
                  key={bootstrap.region ?? "empty"}
                  name="region"
                >
                  <option value="">Select…</option>
                  {TRINIDAD_ONBOARDING_REGION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

              <button
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--scarlet)" }}
                type="submit"
              >
                Next
              </button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" action={formAction} key="courier-onboarding-step-2">
              <input name="step" type="hidden" value="2" />
              <input name="userId" type="hidden" value={bootstrap.id} />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-800">Phone number</label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                    +1 (868)
                  </span>
                  <input
                    required
                    autoComplete="tel"
                    className="flex-1 rounded-r-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
                    defaultValue={bootstrap.phone ?? ""}
                    key={bootstrap.phone ?? "empty-phone"}
                    name="phone"
                    placeholder="XXX-XXXX"
                    type="tel"
                  />
                </div>
                <p className="text-xs text-zinc-500">Trinidad & Tobago number. Enter your 7-digit number.</p>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
                Short bio (optional)
                <textarea
                  className="min-h-[100px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
                  name="bio"
                  placeholder="A sentence about your delivery experience or coverage area."
                  rows={4}
                />
                <span className="text-xs font-normal text-zinc-500">
                  Optional. This helps vendors and customers know who is delivering their orders.
                </span>
              </label>

              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

              <button
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--scarlet)" }}
                type="submit"
              >
                Complete setup
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
