"use client";
import { useActionState, useState } from "react";
import { Check, Circle, CircleCheck, CreditCard } from "lucide-react";
import FormNotice from "@/components/auth/FormNotice";
import FormActions from "@/components/onboarding/FormActions";
import s from "@/components/onboarding/onboarding.module.css";
import type { PlanPickerOption } from "@/lib/onboarding/plan-picker-options";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";
import { confirmBusinessPlanChoice, type BusinessOnboardingState } from "../actions";

export function BusinessPlanPickerForm({ options, defaultPlan }: { options: PlanPickerOption[]; defaultPlan: IntendedPlan }) {
  const [state, action, pending] = useActionState(confirmBusinessPlanChoice, {} as BusinessOnboardingState);
  const [selected, setSelected] = useState(defaultPlan);
  return <form className={s.form} action={action} aria-busy={pending}>
    <fieldset disabled={pending} style={{border:0,padding:0,margin:0,minWidth:0}}><legend className="sr-only">Choose your business plan</legend><div className={s.plans}>{options.map(option => <label className={s.plan} key={option.planId}><input type="radio" name="plan" value={option.planId} checked={selected === option.planId} onChange={() => setSelected(option.planId)} aria-label={option.name} aria-describedby={`plan-${option.planId}`}/><div className={s.planCard}><div className={s.planHeading}>{option.name}{selected === option.planId ? <CircleCheck size={20}/> : <Circle size={20}/>}</div><p className={s.planTagline}>{option.tagline}</p><p className={s.price}>{option.priceLabel}</p><p className={s.priceNote}>{option.priceNote}</p><ul className={s.features} id={`plan-${option.planId}`}>{[option.productCapLabel, option.aiLabel, ...option.commission.split(" · ")].map(feature => <li key={feature}><Check size={12}/><span>{feature}</span></li>)}</ul><span className={s.planSelected}>{selected === option.planId ? "Your selected plan" : `Choose ${option.name}`}</span></div></label>)}</div></fieldset>
    <div className={s.info}><CreditCard size={19}/><div><strong>{selected === "STARTER" ? "Start without a monthly fee" : "Checkout comes after setup"}</strong>{selected === "STARTER" ? "No card needed for Starter. Commission applies when you sell." : "We’ll save your storefront first, then take you to checkout for your chosen subscription."}</div></div>
    <FormNotice message={state.error}/><FormActions pending={pending} label={`Continue with ${options.find(option => option.planId === selected)?.name ?? "Starter"}`}/>
  </form>;
}
