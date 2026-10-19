import { tutorialCatalog, type TutorialName } from "./tutorial-catalog";

export type LessonProgress = { stepId: string; reviewed: string[]; complete: boolean; updatedAt: number };
export type TutorialProgress = Partial<Record<TutorialName, LessonProgress>>;
export type ActiveTutorial = { name: TutorialName; stepId: string; minimized: boolean };
const VERSION = "linkwe-academy:v3";
export function isTutorialName(value: unknown): value is TutorialName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(tutorialCatalog, value);
}
export function normalizeTutorialProgress(saved: unknown): TutorialProgress {
  const result: TutorialProgress = {};
  if (!saved || typeof saved !== "object") return result;
  for (const name of Object.keys(tutorialCatalog) as TutorialName[]) {
    const entry = (saved as Record<string, Partial<LessonProgress>>)[name];
    if (!entry || typeof entry !== "object") continue;
    const ids = tutorialCatalog[name].steps.map(step => step.id);
    const reviewed = Array.isArray(entry.reviewed) ? [...new Set(entry.reviewed.filter(id => typeof id === "string" && ids.includes(id)))] : [];
    result[name] = { stepId: ids.includes(entry.stepId ?? "") ? entry.stepId! : ids[0], reviewed, complete: reviewed.length === ids.length, updatedAt: typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0 };
  }
  return result;
}
export function readTutorialProgress(scope: string): TutorialProgress {
  try { return normalizeTutorialProgress(JSON.parse(localStorage.getItem(`${VERSION}:${scope}`) ?? "{}")); }
  catch { return {}; }
}
export function saveTutorialProgress(scope: string, progress: TutorialProgress): boolean {
  try { localStorage.setItem(`${VERSION}:${scope}`, JSON.stringify(progress)); return true; }
  catch { return false; }
}
export function readActiveTutorial(scope: string): ActiveTutorial | null {
  try {
    const active = JSON.parse(sessionStorage.getItem(`${VERSION}:active:${scope}`) ?? "null");
    if (!active || !isTutorialName(active.name)) return null;
    const name: TutorialName = active.name;
    const steps = tutorialCatalog[name].steps;
    return { name, stepId: steps.some(step => step.id === active.stepId) ? active.stepId : steps[0].id, minimized: active.minimized === true };
  } catch { return null; }
}
export function saveActiveTutorial(scope: string, active: ActiveTutorial | null) {
  try {
    if (active) sessionStorage.setItem(`${VERSION}:active:${scope}`, JSON.stringify(active));
    else sessionStorage.removeItem(`${VERSION}:active:${scope}`);
  } catch { /* The current lesson remains usable when storage is blocked. */ }
}
