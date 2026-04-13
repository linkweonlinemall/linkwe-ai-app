import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

export default async function Home() {
  const user = await getCurrentUser();
  const continueHref = user ? await resolveAuthLandingPath(user) : "/login";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <main className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">LinkWe AI</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Auth foundation
        </h1>
        <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Registration, login, password hashing, and role-aware dashboards are wired with Prisma and signed sessions.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {user ? (
            <Link
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              href={continueHref}
            >
              Continue
            </Link>
          ) : (
            <>
              <Link
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
                href="/register"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
