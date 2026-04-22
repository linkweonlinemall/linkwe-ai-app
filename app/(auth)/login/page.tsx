import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  const { callbackUrl } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mx-auto w-full rounded-xl border border-zinc-200/60 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-zinc-900">
            Link<span style={{ color: "#D4450A" }}>We</span>
          </span>
        </div>

        <h1 className="text-center text-xl font-bold text-zinc-900">Welcome back</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-500">Sign in to your LinkWe account</p>

        <LoginForm callbackUrl={callbackUrl} />

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-medium text-[#1A7FB5] hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
