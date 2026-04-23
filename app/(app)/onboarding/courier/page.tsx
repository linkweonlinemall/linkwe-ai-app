import { redirect } from "next/navigation";

import { advanceCourierOnboardingAction, completeCourierOnboardingAction } from "../actions";
import Button from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { getNextCourierOnboardingStep } from "@/lib/onboarding/courier-progress";

export default async function CourierOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "COURIER") {
    redirect(await resolveAuthLandingPath(user));
  }

  const next = getNextCourierOnboardingStep(user);
  if (next === null) {
    redirect("/dashboard/courier");
  }

  const { step } = await searchParams;
  const onUrl = step === "2" ? 2 : 1;
  if (onUrl !== next) {
    redirect(next === 2 ? "/onboarding/courier?step=2" : "/onboarding/courier");
  }

  const activeStep = next;

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div
          className="rounded-xl bg-white p-6 sm:p-8"
          style={{ border: "1px solid var(--card-border)" }}
        >
          <h1 className="mb-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Courier Setup
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Set up your courier profile to start accepting jobs
          </p>

          {activeStep === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                <p className="font-medium text-zinc-900">What to expect</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>Assignments will appear when retailers release shipments for pickup.</li>
                  <li>Proof-of-delivery and GPS checkpoints will be required for payouts.</li>
                  <li>Background checks and insurance attestations will plug in here later.</li>
                </ul>
              </div>
              <form action={advanceCourierOnboardingAction}>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  type="submit"
                  style={{ backgroundColor: "var(--scarlet)" }}
                >
                  Continue
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                <p className="font-medium text-zinc-900">Almost there</p>
                <p className="mt-2">
                  Operational playbooks and compliance tasks will surface in this step. For now, acknowledge that you
                  understand LinkWe courier policies will apply once deliveries go live.
                </p>
              </div>
              <form action={completeCourierOnboardingAction}>
                <Button type="submit" variant="primary" fullWidth className="h-11">
                  Finish courier onboarding
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
