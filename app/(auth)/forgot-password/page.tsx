"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail } from "lucide-react"
import { toast } from "sonner"

import { icn } from "@/lib/iconography"
import InlineSpinner from "@/components/ui/InlineSpinner"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { requestPasswordReset } = await import("@/app/actions/password-reset")
    const result = await requestPasswordReset(email)
    setLoading(false)
    if ("error" in result) {
      setError(result.error)
      toast.error("Something went wrong. Please try again.", { description: result.error })
    } else {
      setSubmitted(true)
      toast.success("Check your email", {
        description: "If an account exists, we sent a reset link.",
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/linkwe-logo-on-dark.png" alt="LinkWe" width={120} height={40} style={{ width: "auto", height: "40px" }} />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-zinc-100">
          {submitted ? (
            <div className="text-center">
              <Mail className={`${icn.empty} mx-auto mb-4`} aria-hidden strokeWidth={1.25} />
              <h1 className="text-xl font-bold text-zinc-900 mb-2">Check your email</h1>
              <p className="text-sm text-zinc-500 mb-6">If an account exists for that email, we sent a password reset link. Check your inbox and spam folder.</p>
              <Link href="/login" className="text-sm text-[#D4450A] font-medium hover:underline">Back to login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-900 mb-1">Forgot your password?</h1>
              <p className="text-sm text-zinc-500 mb-6">Enter your email and we will send you a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-[#D4450A] focus:ring-0"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4450A] py-3 text-sm font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#B83A09] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <InlineSpinner className="h-4 w-4 text-white" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
                <div className="text-center">
                  <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-700">Back to login</Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
