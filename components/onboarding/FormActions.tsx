import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import s from "./onboarding.module.css";

export default function FormActions({ back, pending, label = "Continue", pendingLabel = "Saving…", disabled = false }: { back?: string; pending: boolean; label?: string; pendingLabel?: string; disabled?: boolean }) {
  return <div className={s.actions}>{back ? <Link className={s.back} href={back} aria-disabled={pending} tabIndex={pending ? -1 : undefined} onClick={event => { if (pending) event.preventDefault(); }}><ArrowLeft size={15}/>Back</Link> : <span className={s.help}>You can change your plan later.</span>}<button type="submit" disabled={pending || disabled} className={s.button}>{pending ? <><LoaderCircle className={s.spinner} size={16}/>{pendingLabel}</> : <>{label}<ArrowRight size={16}/></>}</button></div>;
}
