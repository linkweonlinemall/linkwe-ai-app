"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import FormNotice from "@/components/auth/FormNotice";
import s from "@/components/auth/auth.module.css";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const { requestPasswordReset } = await import("@/app/actions/password-reset");
      const result = await requestPasswordReset(email);
      if ("error" in result) setError(result.error); else setSubmitted(true);
    } catch { setError("We couldn’t send your link. Check your connection and try again."); }
    finally { setLoading(false); }
  }
  return <AuthShell eyebrow="A fresh start" title={submitted ? "Check your inbox." : "Let’s get you back in."} description={submitted ? "If an account exists for that address, a reset link is on its way. Check your inbox and spam folder." : "Forgot your password? Enter your account email and we’ll send you a link to choose a new one."}>
    {submitted ? <div className={s.notice + " " + s.success} role="status"><Mail size={22}/><span>Requested for <strong>{email}</strong>. Follow the link in your email to reset your password.</span></div> : <form className={s.form} onSubmit={handleSubmit} aria-busy={loading}><div className={s.field}><label htmlFor="reset-email">Email address</label><input type="email" id="reset-email" name="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></div><FormNotice message={error}/><button type="submit" disabled={loading} className={s.primary}>{loading ? <><LoaderCircle size={17} className={s.spinner}/>Sending your link…</> : <>Send reset link<ArrowRight size={17}/></>}</button></form>}
    <p className={s.bottomText}><Link href="/login" className={s.textLink}><ArrowLeft size={14}/>Back to sign in</Link></p>
    {submitted && <button type="button" className={s.textLink} style={{display:"flex",margin:"18px auto 0",cursor:"pointer"}} onClick={() => setSubmitted(false)}>Use a different email</button>}
  </AuthShell>;
}
