"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  readCourierOnboardingBootstrap,
  saveCourierOnboardingStep,
  type CourierOnboardingBootstrap,
  type CourierOnboardingFormState,
} from "@/app/actions/courier";
import Button from "@/components/ui/Button";
import { TRINIDAD_ONBOARDING_REGION_OPTIONS } from "@/lib/onboarding/tt-region-options";

const VEHICLE_TYPES = ["Car", "Motorcycle", "Van", "Truck"] as const;

export default function CourierDashboardOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootstrap, setBootstrap] = useState<CourierOnboardingBootstrap | null | undefined>(undefined);
  const [state, formAction] = useActionState(saveCourierOnboardingStep, {} as CourierOnboardingFormState);
  const [selectedVehicle, setSelectedVehicle] = useState<string>(
    bootstrap?.vehicleType ?? ""
  );

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

  useEffect(() => {
    if (bootstrap != null) {
      setSelectedVehicle(bootstrap.vehicleType ?? "");
    }
  }, [bootstrap]);

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

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Vehicle type</label>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map((type) => (
                    <label
                      key={type}
                      className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${
                        selectedVehicle === type
                          ? "border-[#D4450A] bg-[#D4450A]/5"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicleType"
                        value={type}
                        checked={selectedVehicle === type}
                        onChange={() => setSelectedVehicle(type)}
                        className="accent-[#D4450A]"
                      />
                      <span className="text-sm font-medium text-zinc-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

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

              <Button type="submit" variant="primary">
                Next
              </Button>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Tell customers about yourself
                </label>
                <textarea
                  name="courierBio"
                  defaultValue={bootstrap.courierBio ?? ""}
                  placeholder="e.g. Fast and reliable courier based in Port of Spain. 3 years experience delivering across Trinidad."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-[#D4450A] focus:outline-none"
                />
                <p className="text-xs text-zinc-500">
                  This will be visible to customers when you accept deliveries.
                </p>
              </div>

              {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

              <Button type="submit" variant="primary">
                Complete setup
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
