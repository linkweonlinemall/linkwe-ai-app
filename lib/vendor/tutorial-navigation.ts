import { tutorialCatalog, type TutorialName } from "./tutorial-catalog";
/** Extra record/filter parameters must never force a user back to a lesson's starting URL. */
export function tutorialRouteMatches(current: string, expected: string): boolean {
  const a = new URL(current, "https://linkwe.local"), b = new URL(expected, "https://linkwe.local");
  return a.pathname === b.pathname && [...b.searchParams].every(([key, value]) => a.searchParams.get(key) === value);
}
export function tutorialDestination(name: TutorialName, index: number): string {
  const lesson = tutorialCatalog[name];
  // A step without an explicit destination continues in the latest workspace, including record details.
  return lesson.steps.slice(0, index + 1).findLast(step => step.route)?.route ?? lesson.route;
}
export function tutorialPageAllowsTarget(current: string, name: TutorialName, index: number): boolean {
  const pathname = new URL(current, "https://linkwe.local").pathname;
  const step = tutorialCatalog[name].steps[index];
  if (pathname === "/dashboard/vendor/creation/new") return tutorialRouteMatches(current, tutorialDestination(name, index));
  return Boolean(step.within && pathname.startsWith(step.within)) || pathname === new URL(tutorialDestination(name, index), "https://linkwe.local").pathname;
}
export function matchingTutorials(query: string, category: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return (Object.entries(tutorialCatalog) as [TutorialName, (typeof tutorialCatalog)[TutorialName]][]).filter(([, lesson]) => {
    const content = `${lesson.label} ${lesson.description} ${lesson.workspace} ${lesson.prepare} ${lesson.access} ${lesson.steps.map(step => `${step.title} ${step.body} ${step.where}`).join(" ")}`.toLocaleLowerCase();
    return (category === "All lessons" || category === lesson.category) && terms.every(term => content.includes(term));
  }).sort(([, a], [, b]) => {
    // A direct lesson-title match should lead ahead of incidental mentions in steps.
    const titleScore = (label: string) => terms.filter(term => label.toLocaleLowerCase().includes(term)).length;
    return titleScore(b.label) - titleScore(a.label);
  });
}
