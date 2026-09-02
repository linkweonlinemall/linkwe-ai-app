import Link from "next/link";
import { logoutAction } from "@/app/(auth)/auth-actions";
import { getSession } from "@/lib/auth/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f5f5f5]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-[#1C1C1A] px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link className="flex min-w-0 items-center" href="/">
            <img
              src="/linkwe-logo-mobile-on-light.png"
              alt="LinkWe"
              className="h-8 w-auto max-w-32 object-contain"
            />
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
      <div className="flex w-full min-w-0 flex-1 flex-col items-center px-3 py-5 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
