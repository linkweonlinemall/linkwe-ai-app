"use client"
import Link from "next/link"
import Image from "next/image"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4 text-center">
      <Image src="/linkwe-logo-on-light.png" alt="LinkWe" width={120} height={40} style={{ width: "auto", height: "40px" }} className="mb-8" />
      <p className="text-8xl font-black text-[#D4450A] mb-4">500</p>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Something went wrong</h1>
      <p className="text-zinc-500 text-sm mb-8 max-w-sm">An unexpected error occurred. Try refreshing the page or come back shortly.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90">
          Try again
        </button>
        <Link href="/" className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
          Go home
        </Link>
      </div>
    </div>
  )
}
