"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginAction, type AuthFormState } from "../auth-actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {} as AuthFormState);

  return (
    <form className="flex flex-col gap-4" action={formAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />

      <Input
        required
        autoComplete="email"
        className="text-base font-normal"
        label="Email"
        name="email"
        type="email"
      />

      <Input
        required
        autoComplete="current-password"
        className="text-base font-normal"
        label="Password"
        name="password"
        type="password"
      />

      <div className="mb-4 mt-1 flex justify-end">
        <a href="#" className="text-xs text-[#1A7FB5] hover:underline">
          Forgot password?
        </a>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button disabled={pending} fullWidth loading={pending} size="lg" type="submit" variant="primary">
        Sign In
      </Button>
    </form>
  );
}
