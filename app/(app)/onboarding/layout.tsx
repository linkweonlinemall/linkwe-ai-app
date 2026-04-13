import Link from "next/link";
import { logoutAction } from "@/app/(auth)/auth-actions";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Link className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50" href="/">
          LinkWe
        </Link>
        <form action={logoutAction}>
          <button
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
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
