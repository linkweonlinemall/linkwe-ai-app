type Props = {
  mode: "login" | "signup";
  signupKind?: "CUSTOMER" | "BUSINESS";
  intendedPlan?: string | null;
  callbackUrl?: string;
  disabled?: boolean;
};

export default function GoogleAuthButton({ mode, signupKind = "CUSTOMER", intendedPlan, callbackUrl, disabled = false }: Props) {
  const params = new URLSearchParams({ mode, signupKind });
  if (mode === "signup" && !disabled) params.set("termsAccepted", "1");
  if (intendedPlan) params.set("intendedPlan", intendedPlan);
  if (callbackUrl) params.set("callbackUrl", callbackUrl);

  return (
    <>
      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">or</span>
        <div className="h-px flex-1 bg-zinc-200" />
      </div>
      <a
        href={disabled ? undefined : `/api/auth/google/start?${params.toString()}`}
        aria-disabled={disabled}
        className={`flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-colors ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-zinc-50"}`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.614Z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.909-2.258c-.806.54-1.835.86-3.047.86-2.344 0-4.328-1.585-5.037-3.715H.956v2.332A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58Z" />
        </svg>
        {mode === "login" ? "Continue with Google" : "Sign up with Google"}
      </a>
    </>
  );
}
