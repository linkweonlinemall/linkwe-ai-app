"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";

import { verifyEmail, resendVerificationEmail } from "@/app/actions/email-verification";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resendResult, setResendResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid or missing verification link.");
      return;
    }
    (async () => {
      const result = await verifyEmail(token);
      if ("error" in result) {
        setStatus("error");
        setError(result.error);
      } else {
        setStatus("success");
      }
    })();
  }, [token]);

  function handleResend() {
    setResendResult(null);
    startTransition(async () => {
      const result = await resendVerificationEmail();
      setResendResult(result.ok ? { ok: true } : { ok: false, error: result.error });
    });
  }

  if (status === "loading") {
    return <p className="text-center text-sm text-zinc-500">Verifying your email...</p>;
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-xl font-bold text-zinc-900">Your email is verified ✓</h1>
        <p className="mb-6 text-sm text-zinc-500">Thanks for confirming your email address.</p>
        <Link
          href="/login"
          className="inline-block w-full rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white hover:opacity-90"
        >
          Continue to LinkWe
        </Link>
      </div>
    );
  }

  const alreadyVerified = resendResult && !resendResult.ok && resendResult.error === "Your email is already verified.";

  return (
    <div className="text-center">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Link invalid or expired</h1>
      <p className="mb-6 text-sm text-red-500">{error}</p>

      {alreadyVerified ? (
        <p className="mb-4 text-sm font-medium text-emerald-600">Your email is already verified — you&apos;re all set.</p>
      ) : resendResult?.ok ? (
        <p className="mb-4 text-sm font-medium text-emerald-600">A new verification email is on its way.</p>
      ) : (
        <>
          <button
            onClick={handleResend}
            disabled={isPending}
            className="mb-3 w-full rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Sending..." : "Resend verification email"}
          </button>
          {resendResult && !resendResult.ok ? (
            <p className="mb-2 text-sm text-red-500">{resendResult.error}</p>
          ) : null}
        </>
      )}

      <p className="mt-2 text-xs text-zinc-400">
        Not logged in?{" "}
        <Link href="/login" className="font-medium text-[#D4450A] hover:underline">
          Log in
        </Link>{" "}
        and resend from there.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/linkwe-new-logo-light-2.png"
            alt="LinkWe"
            width={180}
            height={56}
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
