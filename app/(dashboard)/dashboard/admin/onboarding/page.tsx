import OnboardingStudio from "./onboarding-studio";
import CreationLauncher from "./creation-launcher";
import { getCreationStudioOptions } from "@/app/actions/admin-creation";
import BulkUserActions from "./bulk-user-actions";

export default async function AdminOnboardingPage() {
  const options=await getCreationStudioOptions();
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4450A]">Admin workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Creation Studio</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">One workspace with two clear paths: build a complete vendor business in a guided flow, or directly create and edit individual marketplace records.</p></div><div className="space-y-8"><CreationLauncher options={options}/><BulkUserActions users={options.users}/><div><h2 className="mb-1 text-lg font-bold">Guided vendor build & CSV import</h2><p className="mb-3 text-sm text-zinc-500">Use this when one job includes the account, entire store and opening inventory. Direct creation above is for one-off records—not a duplicate onboarding flow.</p><OnboardingStudio/></div></div></main>;
}
