"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { resetPassword } from "@/app/actions/password-reset";
import PasswordInput from "@/components/ui/PasswordInput";
import AuthShell from "@/components/auth/AuthShell";
import FormNotice from "@/components/auth/FormNotice";
import s from "@/components/auth/auth.module.css";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const formData = new FormData(event.currentTarget);
    if (formData.get("password") !== formData.get("confirm")) { setError("The passwords don’t match. Please check them and try again."); return; }
    formData.set("token", token); setLoading(true);
    try { const result = await resetPassword(formData); if ("error" in result) setError(result.error); else router.push("/login?message=Password+reset+successfully"); }
    catch { setError("We couldn’t update your password. Please try again."); }
    finally { setLoading(false); }
  }
  if (!token) return <div className={s.form}><FormNotice message="This reset link is missing or incomplete. Request a new one to continue."/><Link href="/forgot-password" className={s.primary}>Request a new link</Link></div>;
  return <form className={s.form} onSubmit={handleSubmit} aria-busy={loading}>
    <div className={`${s.field} ${s.password}`}><label htmlFor="new-password">New password</label><PasswordInput id="new-password" name="password" autoComplete="new-password" required minLength={8} aria-describedby="reset-help"/><p id="reset-help" className={s.help}>Use at least 8 characters.</p></div>
    <div className={`${s.field} ${s.password}`}><label htmlFor="confirm-password">Confirm new password</label><PasswordInput id="confirm-password" name="confirm" autoComplete="new-password" required minLength={8}/></div>
    <FormNotice message={error}/><button type="submit" disabled={loading} className={s.primary}>{loading ? <><LoaderCircle size={17} className={s.spinner}/>Updating…</> : "Save new password"}</button>
  </form>;
}
export default function ResetPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="A new password. A fresh start." description="Choose a password you haven’t used elsewhere, then get back to your LinkWe."><Suspense fallback={<p className={s.help}>Loading your reset link…</p>}><ResetPasswordForm/></Suspense><p className={s.bottomText}><Link href="/login">Back to sign in</Link></p></AuthShell>;
}
