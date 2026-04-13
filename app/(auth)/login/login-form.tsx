"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthFormState } from "../auth-actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {} as AuthFormState);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Use your LinkWe account. New here?{" "}
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50" href="/register">
          Create an account
        </Link>
        .
      </p>

      <form className="mt-8 flex flex-col gap-4" action={formAction}>
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

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
            autoComplete="current-password"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            name="password"
            type="password"
          />
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
