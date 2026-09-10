import OnboardingStudio from "./onboarding-studio";
import CreationLauncher from "./creation-launcher";
import { getCreationStudioOptions } from "@/app/actions/admin-creation";

export default async function AdminOnboardingPage() {
  const options=await getCreationStudioOptions();
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D4450A]">Admin workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">Creation Studio</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">Build complete accounts, stores and inventory as a managed service, then keep creating or editing anything attached to them.</p></div><div className="space-y-8"><CreationLauncher options={options}/><div><h2 className="mb-3 text-lg font-bold">Vendor onboarding and CSV import</h2><OnboardingStudio/></div></div></main>;
}
