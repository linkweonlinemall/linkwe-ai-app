"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthFormState } from "../auth-actions";

type SignupKind = "CUSTOMER" | "BUSINESS" | "COURIER";

const copy: Record<
  SignupKind,
  {
    title: string;
    description: string;
    nameLabel: string;
    nameHelp: string;
    submitLabel: string;
  }
> = {
  CUSTOMER: {
    title: "Customer account",
    description: "Shop the marketplace, track orders, and message sellers.",
    nameLabel: "Full name",
    nameHelp: "How you appear to sellers and support.",
    submitLabel: "Create customer account",
  },
  BUSINESS: {
    title: "Business account",
    description: "Sell on LinkWe. You will get the Vendor role and a short onboarding checklist before store setup.",
    nameLabel: "Full name",
    nameHelp: "Legal or account holder name; store branding is set in onboarding.",
    submitLabel: "Create business account",
  },
  COURIER: {
    title: "Courier account",
    description: "Deliver LinkWe shipments. You will get the Courier role plus a quick orientation before tools go live.",
    nameLabel: "Full name",
    nameHelp: "Used for courier communications and payouts later.",
    submitLabel: "Create courier account",
  },
};

export function RegisterForm({ signupKind }: { signupKind: SignupKind }) {
  const [state, formAction, pending] = useActionState(registerAction, {} as AuthFormState);
  const c = copy[signupKind];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{c.title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{c.description}</p>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50" href="/login">
          Sign in
        </Link>
        {" · "}
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50" href="/register">
          Other signup types
        </Link>
      </p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <input name="signupKind" type="hidden" value={signupKind} />

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {c.nameLabel}
          <input
            required
            autoComplete={signupKind === "BUSINESS" ? "organization" : "name"}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="fullName"
            type="text"
          />
          <span className="text-xs font-normal text-zinc-500">{c.nameHelp}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Email
          <input
            required
            autoComplete="email"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="email"
            type="email"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Password
          <input
            required
            autoComplete="new-password"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="password"
            type="password"
          />
          <span className="text-xs font-normal text-zinc-500">At least 8 characters.</span>
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" role="alert">
            {state.error}
          </p>
        ) : null}

        <button
          className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating account…" : c.submitLabel}
        </button>
      </form>
    </div>
  );
}
