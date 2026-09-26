export const STARTER_PHOTO_TRIAL = 1;
export type PhotoPlanStore = { ownerId: string; subscriptionPlan: string; subscriptionStatus: string; planRenewsAt: Date | null };
export const photoPlanSelect = { id: true, ownerId: true, subscriptionPlan: true, subscriptionStatus: true, planRenewsAt: true } as const;

export function photoAccess(store: PhotoPlanStore, used: number, now = new Date()) {
  const paid = ["GROWTH", "PRO"].includes(store.subscriptionPlan) && store.subscriptionStatus === "ACTIVE" && (!store.planRenewsAt || store.planRenewsAt > now);
  const trialRemaining = Math.max(0, STARTER_PHOTO_TRIAL - used);
  return { plan: store.subscriptionPlan, paid, allowed: paid || trialRemaining > 0, trialLimit: STARTER_PHOTO_TRIAL, trialRemaining };
}

export function photoTrialKey(ownerId: string, sandbox: boolean) {
  // Lifetime per vendor, independent of store recreation, tier changes or day.
  return `photo-studio:${sandbox ? "test" : "live"}:trial:${ownerId}`;
}
