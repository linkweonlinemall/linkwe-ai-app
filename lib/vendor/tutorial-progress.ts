import { tutorialCatalog, type TutorialName } from "./tutorial-catalog";

export type TutorialProgress = Partial<Record<TutorialName, { step: number; complete: boolean }>>;
const KEY = "linkwe-tutorials:2026-09-25";

export function readTutorialProgress(): TutorialProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const result: TutorialProgress = {};
    for (const name of Object.keys(tutorialCatalog) as TutorialName[]) {
      const entry = saved?.[name];
      if (entry && Number.isInteger(entry.step) && entry.step >= 0) {
        result[name] = { step: Math.min(entry.step, tutorialCatalog[name].steps.length - 1), complete: entry.complete === true };
      }
    }
    return result;
  } catch { return {}; }
}

export function saveTutorialProgress(name: TutorialName, step: number, complete = false) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readTutorialProgress(), [name]: { step, complete } })); }
  catch { /* Lessons remain usable when browser storage is unavailable. */ }
}
