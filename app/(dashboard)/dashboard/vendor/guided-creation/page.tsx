import { listCreationGuides, getCreationGuide } from "@/app/actions/guided-creation";
import GuidedCreationWorkspace from "@/components/vendor/guided-creation/GuidedCreationWorkspace";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ guide?: string }> }) {
  const { guide } = await searchParams;
  const library = await listCreationGuides();
  let initialPlan = null;
  let initialError = "";
  if (guide) { try { initialPlan = await getCreationGuide(guide); } catch { initialError = "That guide is unavailable. Choose a saved guide below."; } }
  return <GuidedCreationWorkspace library={library} initialPlan={initialPlan} initialError={initialError}/>;
}
