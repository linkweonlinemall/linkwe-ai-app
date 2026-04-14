import Link from "next/link";
import { logoutAction } from "@/app/(auth)/auth-actions";
import { getSession } from "@/lib/auth/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f5f5]">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-[#1C1C1A] px-6 py-4">
        <div className="flex items-center gap-6">
          <Link className="text-sm font-semibold tracking-tight text-white" href="/">
            LinkWe
          </Link>
          {session ? (
            <span className="text-sm font-medium text-[#D4450A] capitalize">{session.role.toLowerCase()}</span>
          ) : null}
        </div>
        <form action={logoutAction}>
          <button
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="flex flex-1 flex-col items-center px-6 py-12">{children}</div>
    </div>
  );
}
