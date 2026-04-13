import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";

export default async function RegisterHubPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  const cards = [
    {
      href: "/register/customer",
      title: "Customer",
      body: "Browse and buy. One welcome screen, then your shopper dashboard.",
    },
    {
      href: "/register/business",
      title: "Business",
      body: "Sell as a vendor. Guided business onboarding (account, ID, store) before the vendor dashboard.",
    },
    {
      href: "/register/courier",
      title: "Courier",
      body: "Deliver for LinkWe. Courier orientation, then dispatch tools as they roll out.",
    },
  ] as const;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Create an account</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Pick how you will use LinkWe. Admin accounts are never self-serve; operations grants the Admin role manually.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            className="flex flex-col rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-950"
            href={card.href}
          >
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{card.title}</span>
            <span className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{card.body}</span>
            <span className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">Continue →</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already registered?{" "}
        <Link className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
