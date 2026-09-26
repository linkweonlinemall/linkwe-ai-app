"use client";
import { useActionState } from "react";
import RegionSelect from "@/components/ui/RegionSelect";
import FormNotice from "@/components/auth/FormNotice";
import FormActions from "@/components/onboarding/FormActions";
import s from "@/components/onboarding/onboarding.module.css";
import { saveBusinessOnboardingStep1, type BusinessOnboardingState } from "../actions";

type Props = { defaultFullName: string; defaultPhone: string; defaultRegion: string };
export function BusinessStep1Form({ defaultFullName, defaultPhone, defaultRegion }: Props) {
  const [state, action, pending] = useActionState(saveBusinessOnboardingStep1, {} as BusinessOnboardingState);
  return <form className={s.form} action={action} onReset={event => event.preventDefault()} aria-busy={pending}>
    <div className={s.field}><label htmlFor="full-name">Your full name</label><input id="full-name" name="fullName" autoComplete="name" required maxLength={120} defaultValue={defaultFullName}/></div>
    <div className={s.field}><label htmlFor="phone">Phone number <span className={s.optional}>Optional for now</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="868 555 0123" defaultValue={defaultPhone} aria-describedby="phone-help"/><p className={s.help} id="phone-help">Use a Trinidad & Tobago number. You can enter 7 digits or include +1 (868).</p></div>
    <RegionSelect name="region" defaultValue={defaultRegion} required label="Your region"/>
    <FormNotice message={state.error}/>
    <FormActions back="/onboarding/business/plan" pending={pending}/>
  </form>;
}
