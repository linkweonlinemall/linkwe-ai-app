"use server";

import { redirect } from "next/navigation";

export type StoreSetupState = {
  error?: string;
};

/** @deprecated Create the store from `/onboarding/business/step-3`. */
export async function createStoreAction(_prev: StoreSetupState, _formData: FormData): Promise<StoreSetupState> {
  redirect("/onboarding/business/step-3");
}
