"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShoppingBag, Store } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import FormNotice from "@/components/auth/FormNotice";
import PasswordInput from "@/components/ui/PasswordInput";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import s from "@/components/auth/auth.module.css";
import { registerAction, type AuthFormState } from "../auth-actions";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";

export function RegisterForm({ signupKind, intendedPlan = null, oauthError }: {
  signupKind: "CUSTOMER" | "BUSINESS";
  intendedPlan?: IntendedPlan | null;
  oauthError?: string;
}) {
  const [state, formAction, pending] = useActionState(registerAction, {} as AuthFormState);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  const business = signupKind === "BUSINESS";
  return <AuthShell business={business} eyebrow={business ? "For your business" : "For the love of local"}
    title={business ? "Let’s build your next chapter." : "Make yourself at home."}
    description={business ? "Create your account, then we’ll help you set up your storefront. Start free and grow at your own pace." : "Your local favourites, orders, bookings and tickets—all together in one place."}>
    <Link href="/register" className={s.textLink} style={{marginBottom:22}}><ArrowLeft size={14}/>Change account type</Link>
    <form className={s.form} action={formAction} onReset={event => event.preventDefault()} aria-busy={pending}>
      <input name="signupKind" type="hidden" value={signupKind}/>
      {business && intendedPlan && <input name="intendedPlan" type="hidden" value={intendedPlan}/>}
      <div className={s.field}><label htmlFor="signup-name">Your full name</label><input id="signup-name" name="fullName" autoComplete="name" required maxLength={120} placeholder="First and last name" aria-describedby={business ? "name-help" : undefined}/>{business && <p className={s.help} id="name-help">Your name first. We’ll add your business name during setup.</p>}</div>
      <div className={s.field}><label htmlFor="signup-email">Email address</label><input id="signup-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required placeholder="you@example.com"/></div>
      <div className={`${s.field} ${s.password}`}><label htmlFor="signup-password">Create a password</label><PasswordInput id="signup-password" name="password" autoComplete="new-password" required minLength={8} aria-describedby="password-help" onChange={event => setPasswordLength(event.target.value.length)}/><p id="password-help" className={s.passwordRules} data-ready={passwordLength >= 8}><Check size={13}/>At least 8 characters{passwordLength >= 8 ? " · You’re all set" : ""}</p></div>
      <FormNotice message={state.error || oauthError}/>
      <div className={s.terms}><input required type="checkbox" id="terms" name="termsAccepted" value="yes" checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)}/><label htmlFor="terms">I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link>, and confirm I’m at least 18 years old.</label></div>
      <button className={s.primary} type="submit" disabled={pending}>{pending ? <><LoaderCircle size={17} className={s.spinner}/>Creating your account…</> : <>Create {business ? "business" : "customer"} account<ArrowRight size={17}/></>}</button>
    </form>
    <GoogleAuthButton mode="signup" signupKind={signupKind} intendedPlan={intendedPlan} disabled={!termsAccepted || pending}/>
    {!termsAccepted && <p className={s.help} style={{textAlign:"center",marginTop:9}}>Accept the terms above to continue with Google.</p>}
    <p className={s.bottomText}>Already part of LinkWe? <Link href="/login">Sign in</Link></p>
  </AuthShell>;
}

export function RegisterHubClient() {
  return <AuthShell eyebrow="A little more local" title="There’s a place for you here." description="Find your next favourite thing, or bring your business to the neighbourhood. How would you like to start?">
    <div className={s.roleList}>
      <Link className={s.roleCard} href="/register/customer"><span className={s.roleIcon}><ShoppingBag size={23}/></span><div><strong>I’m here to explore</strong><p>Shop local, book services and discover experiences.</p></div><ArrowRight size={18}/></Link>
      <Link className={s.roleCard} href="/register/business"><span className={s.roleIcon}><Store size={23}/></span><div><strong>I’m growing a business</strong><p>Sell products, offer services and host events.</p></div><ArrowRight size={18}/></Link>
    </div>
    <p className={s.bottomText}>Already have an account? <Link href="/login">Sign in</Link></p>
  </AuthShell>;
}
