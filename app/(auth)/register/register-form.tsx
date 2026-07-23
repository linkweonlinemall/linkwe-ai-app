"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerAction, type AuthFormState } from "../auth-actions";
import type { IntendedPlan } from "@/lib/onboarding/intended-plan";

type SignupKind = "CUSTOMER" | "BUSINESS";

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
};

export function RegisterForm({
  signupKind,
  embedded = false,
  intendedPlan = null,
}: {
  signupKind: SignupKind;
  embedded?: boolean;
  intendedPlan?: IntendedPlan | null;
}) {
  const [state, formAction, pending] = useActionState(registerAction, {} as AuthFormState);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const c = copy[signupKind];

  const formInner = (
    <>
      {!embedded ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{c.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">{c.description}</p>
          <p className="mt-3 text-sm text-zinc-600">
            Already have an account?{" "}
            <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline" href="/login">
              Sign in
            </Link>
            {" · "}
            <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline" href="/register">
              Other signup types
            </Link>
          </p>
        </>
      ) : null}

      <form className={`flex flex-col gap-4 ${embedded ? "" : "mt-8"}`} action={formAction}>
        <input name="signupKind" type="hidden" value={signupKind} />
        {intendedPlan && signupKind === "BUSINESS" ? (
          <input name="intendedPlan" type="hidden" value={intendedPlan} />
        ) : null}

        <Input
          required
          autoComplete={signupKind === "BUSINESS" ? "organization" : "name"}
          className="text-base font-normal"
          helperText={c.nameHelp}
          label={c.nameLabel}
          name="fullName"
          type="text"
        />

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
          autoComplete="new-password"
          className="text-base font-normal"
          helperText="At least 8 characters."
          label="Password"
          name="password"
          type="password"
        />

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4450A]"
          />
          <label htmlFor="terms" className="text-xs leading-relaxed text-zinc-600">
            I agree to the{" "}
            <a href="/terms" target="_blank" className="font-semibold text-[#D4450A] hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" target="_blank" className="font-semibold text-[#D4450A] hover:underline">
              Privacy Policy
            </a>
            . I confirm I am at least 18 years old.
          </label>
        </div>

        <Button
          className="mt-2"
          fullWidth
          loading={pending}
          size="lg"
          type="submit"
          variant="primary"
          disabled={!termsAccepted}
        >
          {c.submitLabel}
        </Button>
      </form>

      {embedded ? (
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link className="font-medium text-[#1A7FB5] hover:underline" href="/login">
            Sign in
          </Link>
          {" · "}
          <Link className="font-medium text-[#1A7FB5] hover:underline" href="/register">
            Other signup types
          </Link>
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return formInner;
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200/60 bg-white p-8 shadow-sm">
      {formInner}
    </div>
  );
}

type HubRole = "customer" | "vendor";

const HUB_ROLES: {
  id: HubRole;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: "customer",
    icon: "🛒",
    title: "Shop as Customer",
    description: "Browse and buy from local vendors",
  },
  {
    id: "vendor",
    icon: "🏪",
    title: "Sell as Vendor",
    description: "Open your store and sell products",
  },
];

const HUB_HREF: Record<HubRole, string> = {
  customer: "/register/customer",
  vendor: "/register/business",
};

export function RegisterHubClient() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<HubRole | null>(null);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-zinc-200/60 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <img
            src="/linkwe-new-logo-light-2.png"
            alt="LinkWe"
            className="mx-auto h-14 w-auto object-contain"
          />
        </div>

        <h1 className="text-center text-xl font-bold text-zinc-900">Join LinkWe</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-500">How would you like to use LinkWe?</p>

        <div className="grid grid-cols-1 gap-3">
          {HUB_ROLES.map(({ id, icon, title, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedRole(id)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 ${
                selectedRole === id
                  ? "border-[#D4450A] bg-[#FEF2EE]"
                  : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">{title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
              </div>
              {selectedRole === id ? (
                <div
                  className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#D4450A" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : null}
            </button>
          ))}
        </div>

        <Button
          className="mt-6"
          disabled={!selectedRole}
          fullWidth
          size="lg"
          type="button"
          variant="primary"
          onClick={() => {
            if (selectedRole) router.push(HUB_HREF[selectedRole]);
          }}
        >
          Continue →
        </Button>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-[#1A7FB5] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
