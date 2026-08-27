import { redirect } from "next/navigation";

import { RegisterForm } from "@/app/(auth)/register/register-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { parseIntendedPlanParam } from "@/lib/onboarding/intended-plan";

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function RegisterBusinessPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  const sp = await searchParams;
  const intendedPlan = parseIntendedPlanParam(sp.plan);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-zinc-200/60 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <img
              src="/linkwe-logo-on-dark.png"
              alt="LinkWe"
              className="mx-auto h-14 w-auto object-contain"
            />
          </div>

          <h1 className="text-center text-xl font-bold text-zinc-900">Create your vendor account</h1>
          <p className="mb-6 mt-1 text-center text-sm text-zinc-500">Set up your business on LinkWe</p>

          <RegisterForm embedded signupKind="BUSINESS" intendedPlan={intendedPlan} />
        </div>
      </div>
    </div>
  );
}
