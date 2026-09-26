"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Camera, CheckCircle2, FileCheck2, LoaderCircle, ShieldCheck } from "lucide-react";
import FormNotice from "@/components/auth/FormNotice";
import FormActions from "@/components/onboarding/FormActions";
import s from "@/components/onboarding/onboarding.module.css";
import { validateOnboardingFile } from "@/lib/onboarding/upload-validation";
import { saveBusinessOnboardingStep2, skipBusinessIdentityVerification, type BusinessOnboardingState } from "../actions";

function SkipButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className={`${s.button} ${s.secondary}`}>{pending ? <><LoaderCircle size={16} className={s.spinner}/>Continuing…</> : label}</button>;
}

export function BusinessStep2Form({ verificationStatus, hasDocuments }: { verificationStatus: string; hasDocuments: boolean }) {
  const [state, action, pending] = useActionState(saveBusinessOnboardingStep2, {} as BusinessOnboardingState);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string>();
  const submitted = hasDocuments && (verificationStatus === "APPROVED" || verificationStatus === "PENDING");
  return <>
    {submitted ? <div className={s.info}><CheckCircle2 size={22}/><div><strong>{verificationStatus === "APPROVED" ? "Your identity is verified" : "Your documents are ready for review"}</strong>You don’t need to upload them again. Continue to your storefront.</div></div> : <form action={action} onReset={event => event.preventDefault()} className={s.form} aria-busy={pending}>
      <div className={s.info}><ShieldCheck size={21}/><div><strong>Your ID stays off your storefront</strong>Upload a clear government-issued ID and a selfie holding it. Verification is required before your store can go live, but you can finish setting up first.</div></div>
      <div className={s.uploadGrid}>{([{name:"document",title:"Your photo ID",hint:"JPG, PNG, WebP or PDF · Up to 3 MB",accept:"image/jpeg,image/png,image/webp,application/pdf",icon:FileCheck2}, {name:"selfieWithId",title:"Selfie holding your ID",hint:"JPG, PNG or WebP · Up to 3 MB",accept:"image/jpeg,image/png,image/webp",icon:Camera}]).map(item => <label key={item.name} className={s.upload} data-selected={Boolean(files[item.name])}><item.icon size={29}/><strong>{item.title}</strong><span>{files[item.name] || "Choose a file"}</span><span>{item.hint}</span><input disabled={pending} type="file" name={item.name} aria-label={item.title} accept={item.accept} onChange={event => { const file = event.target.files?.[0]; const error = file ? validateOnboardingFile(file, item.name === "document" ? "document" : "selfie") : null; if(error) event.target.value = ""; setFileError(error ?? undefined); setFiles(previous => ({...previous, [item.name]: error ? "" : file?.name ?? ""})); }}/></label>)}</div>
      <p className={s.help}>Keep your face and all four corners of your ID visible. Choose both files to submit them for review.</p>
      <FormNotice message={fileError || state.error}/>
      <FormActions back="/onboarding/business/step-1" pending={pending} label="Submit & continue" pendingLabel="Uploading securely…" disabled={!files.document || !files.selfieWithId}/>
    </form>}
    <form action={skipBusinessIdentityVerification} className={s.skip}><div><strong>{submitted ? "On to the good part." : "Don’t have your ID handy?"}</strong><p>{submitted ? "Give your business a storefront of its own." : "Finish your storefront now. Add your ID later from the verification checklist in your dashboard."}</p></div><SkipButton disabled={pending} label={submitted ? "Continue to storefront" : "Skip for now"}/></form>
  </>;
}
