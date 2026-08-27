"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { resetPassword } from "@/app/actions/password-reset";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await resetPassword(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      router.push("/login?message=Password+reset+successfully");
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="mb-4 text-sm text-red-500">Invalid reset link. Please request a new one.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-[#D4450A] hover:underline">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Set new password</h1>
      <p className="mb-6 text-sm text-zinc-500">Choose a strong password for your LinkWe account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">New password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-[#D4450A] focus:ring-0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Confirm password</label>
          <input
            name="confirm"
            type="password"
            required
            placeholder="Repeat your password"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-[#D4450A] focus:ring-0"
          />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Reset password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image
            src="/linkwe-logo-on-dark.png"
            alt="LinkWe"
            width={180}
            height={56}
            className="h-14 w-auto object-contain"
          />
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-sm">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
