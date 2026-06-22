import { cookies } from "next/headers";

export const INTENDED_PLAN_COOKIE_NAME = "lw_intended_plan";
export const PLAN_PICKER_CONFIRMED_COOKIE_NAME = "lw_plan_picker_confirmed";

export type IntendedPlan = "STARTER" | "GROWTH" | "PRO";

const MAX_AGE_SECONDS = 60 * 60 * 24;

export const intendedPlanCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/** Normalize ?plan= query param (case-insensitive). Unknown values → null. */
export function parseIntendedPlanParam(raw: string | null | undefined): IntendedPlan | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "starter") return "STARTER";
  if (v === "growth") return "GROWTH";
  if (v === "pro") return "PRO";
  return null;
}

function parseStoredIntendedPlan(value: string | undefined): IntendedPlan | null {
  if (value === "STARTER" || value === "GROWTH" || value === "PRO") return value;
  return parseIntendedPlanParam(value);
}

export async function setIntendedPlanCookie(plan: IntendedPlan): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INTENDED_PLAN_COOKIE_NAME, plan, intendedPlanCookieOptions);
}

export async function getIntendedPlanCookie(): Promise<IntendedPlan | null> {
  const cookieStore = await cookies();
  return parseStoredIntendedPlan(cookieStore.get(INTENDED_PLAN_COOKIE_NAME)?.value);
}

export async function clearIntendedPlanCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(INTENDED_PLAN_COOKIE_NAME, "", { ...intendedPlanCookieOptions, maxAge: 0 });
}

export async function setPlanPickerConfirmedCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PLAN_PICKER_CONFIRMED_COOKIE_NAME, "1", intendedPlanCookieOptions);
}

export async function getPlanPickerConfirmedCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PLAN_PICKER_CONFIRMED_COOKIE_NAME)?.value === "1";
}
