import { redirect } from "next/navigation";

import { RegisterForm } from "@/app/(auth)/register/register-form";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { parseIntendedPlanParam } from "@/lib/onboarding/intended-plan";

type Props = {
  searchParams: Promise<{ plan?: string; error?: string }>;
};

export default async function RegisterBusinessPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  const sp = await searchParams;
  const intendedPlan = parseIntendedPlanParam(sp.plan);

  return <RegisterForm signupKind="BUSINESS" intendedPlan={intendedPlan} oauthError={sp.error} />;
}
