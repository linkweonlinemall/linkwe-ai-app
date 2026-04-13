import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { getNextCourierOnboardingStep } from "@/lib/onboarding/courier-progress";
import { advanceCourierOnboardingAction, completeCourierOnboardingAction } from "../actions";

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
    <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Courier onboarding</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">LinkWe delivery network</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Step {activeStep} of 2 · You have the Courier role. Finish this short orientation before accessing courier tools.
      </p>

      {activeStep === 1 ? (
        <div className="mt-8 flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">What to expect</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Assignments will appear when retailers release shipments for pickup.</li>
              <li>Proof-of-delivery and GPS checkpoints will be required for payouts.</li>
              <li>Background checks and insurance attestations will plug in here later.</li>
            </ul>
          </div>
          <form action={advanceCourierOnboardingAction}>
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              type="submit"
            >
              Continue
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Almost there</p>
            <p className="mt-2">
              Operational playbooks and compliance tasks will surface in this step. For now, acknowledge that you
              understand LinkWe courier policies will apply once deliveries go live.
            </p>
          </div>
          <form action={completeCourierOnboardingAction}>
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              type="submit"
            >
              Finish courier onboarding
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
