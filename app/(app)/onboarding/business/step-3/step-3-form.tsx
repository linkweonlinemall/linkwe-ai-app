"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Store } from "lucide-react";
import RegionSelect from "@/components/ui/RegionSelect";
import FormNotice from "@/components/auth/FormNotice";
import FormActions from "@/components/onboarding/FormActions";
import { suggestStoreSlug } from "@/components/vendor/StoreIdentityFields";
import { STORE_CATEGORY_GROUPS } from "@/lib/onboarding/store-categories";
import { validateOnboardingFile } from "@/lib/onboarding/upload-validation";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";
import s from "@/components/onboarding/onboarding.module.css";
import { saveBusinessOnboardingStep3, type BusinessOnboardingState } from "../actions";

type Props = { userId: string; defaultName: string; defaultSlug: string; defaultCategoryId: string; defaultRegion: string; defaultTagline: string; plan: IntendedPlan; planLabel: string };
export function BusinessStep3Form(props: Props) {
  const [state, action, pending] = useActionState(saveBusinessOnboardingStep3, {} as BusinessOnboardingState);
  const [draft, setDraft] = useState({name:props.defaultName,slug:props.defaultSlug,categoryId:props.defaultCategoryId,region:props.defaultRegion,tagline:props.defaultTagline});
  const [slugEdited, setSlugEdited] = useState(Boolean(props.defaultSlug));
  const [ready, setReady] = useState(false);
  const [fileError, setFileError] = useState<string>();
  const storageKey = `linkwe:onboarding:store:${props.userId}`;
  useEffect(() => {
    // Hydrate only this account's non-sensitive storefront draft after mount.
    // Passwords, personal details and uploaded identity documents are never stored here.
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (saved && typeof saved === "object") {
        const fields = ["name", "slug", "categoryId", "region", "tagline"] as const;
        if (fields.every(key => typeof saved[key] === "string" && saved[key].length <= 200)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the browser draft after server hydration
          setDraft({name:saved.name,slug:saved.slug,categoryId:saved.categoryId,region:saved.region,tagline:saved.tagline});
          setSlugEdited(Boolean(saved.slug));
        }
      }
    } catch { /* Storage may be disabled; the form still works normally. */ }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (ready) { try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* Optional browser draft. */ } }
  }, [draft, ready, storageKey]);
  return <form className={s.form} action={action} onReset={event => event.preventDefault()} aria-busy={pending}>
    <div className={s.preview}><span><Store size={14} style={{display:"inline",marginRight:7,verticalAlign:"text-bottom"}}/>Your storefront, taking shape</span><h2>{draft.name || "Your business belongs here."}</h2><p>{draft.tagline || "A little introduction to what makes you, you."}</p></div>
    <div className={s.field}><label htmlFor="store-name">Business name</label><input id="store-name" name="name" autoComplete="organization" required maxLength={120} placeholder="The name your customers know" value={draft.name} onChange={event => { const name = event.target.value; setDraft({...draft,name,slug:slugEdited ? draft.slug : suggestStoreSlug(name)}); }}/></div>
    <div className={s.field}><label htmlFor="store-tagline">Your business in a sentence</label><textarea id="store-tagline" name="tagline" required maxLength={200} placeholder="What do you offer, and what makes it special?" value={draft.tagline} onChange={event => setDraft({...draft,tagline:event.target.value})} aria-describedby="tagline-help"/><p className={s.help} id="tagline-help">A short introduction for your storefront. {draft.tagline.length}/200</p></div>
    <div className={s.field}><label htmlFor="store-slug">Store link</label><input id="store-slug" name="slug" required minLength={3} maxLength={64} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" autoCapitalize="none" spellCheck={false} value={draft.slug} onChange={event => {setSlugEdited(true);setDraft({...draft,slug:event.target.value.toLowerCase()});}} aria-describedby="store-link-help"/><p className={s.help} id="store-link-help">Your address: /store/{draft.slug || "your-business"}. Use lowercase letters, numbers and single hyphens.</p></div>
    <div className={s.twoColumns}><div className={s.field}><label htmlFor="store-category">Business category</label><select id="store-category" name="categoryId" required value={draft.categoryId} onChange={event => setDraft({...draft,categoryId:event.target.value})}><option value="" disabled>Choose a category</option>{STORE_CATEGORY_GROUPS.map(group => <optgroup label={group.group} key={group.group}>{group.items.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</optgroup>)}</select></div><RegionSelect name="region" required label="Store region" value={draft.region} onChange={region => setDraft({...draft,region})}/></div>
    <div className={s.field}><label htmlFor="store-logo">Business logo <span className={s.optional}>Optional</span></label><input id="store-logo" type="file" name="logo" accept="image/jpeg,image/png,image/webp" aria-describedby="logo-help" onChange={event => { const file = event.target.files?.[0]; const error = file ? validateOnboardingFile(file, "logo") : null; setFileError(error ?? undefined); if(error) event.target.value = ""; }}/><p id="logo-help" className={s.help}>A square JPG, PNG or WebP, up to 3 MB. You can add this later.</p></div>
    <div className={s.review}><div><strong>{props.planLabel}</strong><p>{props.plan === "STARTER" ? "No monthly payment. Create your storefront and continue to your dashboard." : "Your storefront will be saved before you continue to subscription checkout."}</p></div><Link href="/onboarding/business/plan">Change</Link></div>
    <FormNotice message={fileError || state.error}/>
    <p className={s.help}>Your store starts as a draft. Complete verification and the launch checklist in your dashboard before going live.</p>
    <FormActions back="/onboarding/business/step-2" pending={pending} disabled={!ready} label={props.plan === "STARTER" ? "Create my storefront" : "Save & continue to checkout"} pendingLabel="Creating your storefront…"/>
  </form>;
}
