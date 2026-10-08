import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/(auth)/auth-actions";
import type { Metadata } from "next";
export const metadata:Metadata={title:"Team workspace",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function TeamLayout({children}:{children:React.ReactNode}) {
 const session = await getSession();
 return <div className="min-h-screen bg-[#f4f7f7] text-[#203e47]">
  <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
   <Link href="/team" className="text-xl font-semibold">LinkWe <span className="text-sm font-normal text-slate-500">/ Team workspace</span></Link>
   <div className="flex items-center gap-5"><Link className="text-sm underline" href="/dashboard">My account ↗</Link>{session && <form action={logoutAction}><button className="text-sm underline">Sign out</button></form>}</div>
  </header><main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
 </div>;
}
