import Link from "next/link"
import Image from "next/image"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F5] px-4 text-center">
      <Image src="/linkwe-logo-on-light.png" alt="LinkWe" width={120} height={40} style={{ width: "auto", height: "40px" }} className="mb-8" />
      <p className="text-8xl font-black text-[#D4450A] mb-4">404</p>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Page not found</h1>
      <p className="text-zinc-500 text-sm mb-8 max-w-sm">This page doesn't exist or has been moved. Let's get you back on track.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/" className="rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-bold text-white hover:opacity-90">
          Go home
        </Link>
        <Link href="/shop" className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
          Browse shop
        </Link>
      </div>
    </div>
  )
}
