"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { verifyEmail, resendVerificationEmail } from "@/app/actions/email-verification";
import AuthShell from "@/components/auth/AuthShell";
import FormNotice from "@/components/auth/FormNotice";
import s from "@/components/auth/auth.module.css";

function VerificationResult({ token }: { token: string }) {
  const verification = useRef<ReturnType<typeof verifyEmail> | null>(null);
  const [result, setResult] = useState<{error?: string; ok?: boolean} | null>(null);
  const [pending, startTransition] = useTransition();
  const [resend, setResend] = useState<{ok: boolean; error?: string} | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    // Reuse the request during Strict Mode's effect replay: verification links
    // are single-use, so a second request could incorrectly report an expired link.
    verification.current ??= verifyEmail(token);
    verification.current.then(response => { if(!cancelled) setResult("error" in response ? {error:response.error} : {ok:true}); }).catch(() => { if(!cancelled) setResult({error:"We couldn’t check this link. Please try again."}); });
    return () => { cancelled = true; };
  }, [token]);
  if (token && !result) return <p className={s.help} role="status"><LoaderCircle size={17} className={s.spinner} style={{display:"inline",marginRight:8}}/>Verifying your email…</p>;
  const alreadyVerified = resend?.error === "Your email is already verified.";
  if (result?.ok || alreadyVerified) return <div className={s.form}><FormNotice success message="Your email is verified. Thanks for confirming it!"/><Link href="/login" className={s.primary}>Continue to LinkWe</Link></div>;
  return <div className={s.form}><FormNotice message={result?.error || "This verification link is missing or incomplete."}/>{resend?.ok ? <FormNotice success message="A new verification email is on its way. Check your inbox and spam folder."/> : <><button type="button" className={s.primary} disabled={pending} onClick={() => startTransition(async () => { try { setResend(await resendVerificationEmail()); } catch { setResend({ok:false,error:"We couldn’t send the email. Please try again."}); } })}>{pending ? "Sending…" : "Resend verification email"}</button><FormNotice message={resend?.error}/></>}<p className={s.help}>You’ll need to be signed in to resend your verification email.</p><Link href="/login" className={s.textLink}>Back to sign in</Link></div>;
}
function VerifyEmailContent() { const token = useSearchParams().get("token") ?? ""; return <VerificationResult key={token} token={token}/>; }
export default function VerifyEmailPage() {
  return <AuthShell eyebrow="One little check" title="Let’s confirm it’s you." description="Verifying your email helps keep your account connected and ready to use."><Suspense fallback={<p className={s.help}>Loading…</p>}><VerifyEmailContent/></Suspense></AuthShell>;
}
