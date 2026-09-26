"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import FormNotice from "@/components/auth/FormNotice";
import { loginAction, type AuthFormState } from "../auth-actions";
import s from "@/components/auth/auth.module.css";

export function LoginForm({ callbackUrl, oauthError, passwordReset = false }: { callbackUrl?: string; oauthError?: string; passwordReset?: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, {} as AuthFormState);
  return <>
    <form className={s.form} action={formAction} onReset={event => event.preventDefault()} aria-busy={pending}>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""}/>
      <FormNotice message={passwordReset ? "Your password has been updated. Sign in with your new password." : undefined} success/>
      <div className={s.field}><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" required autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@example.com" disabled={pending}/></div>
      <div className={`${s.field} ${s.password}`}><div className={s.fieldHeader}><label htmlFor="login-password">Password</label><Link href="/forgot-password" className={s.textLink}>Forgot password?</Link></div><PasswordInput id="login-password" name="password" required autoComplete="current-password" placeholder="Your password" disabled={pending}/></div>
      <FormNotice message={state.error || oauthError}/>
      <button className={s.primary} type="submit" disabled={pending}>{pending ? <><LoaderCircle size={17} className={s.spinner}/>Signing you in…</> : <>Sign in <ArrowRight size={17}/></>}</button>
    </form>
    <GoogleAuthButton mode="login" callbackUrl={callbackUrl} disabled={pending}/>
  </>;
}
