import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { RegisterForm } from "../register-form";

export default async function RegisterCourierPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-zinc-200/60 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-zinc-900">
            Link<span style={{ color: "#D4450A" }}>We</span>
          </span>
        </div>

        <h1 className="text-center text-xl font-bold text-zinc-900">Create your courier account</h1>
        <p className="mb-6 mt-1 text-center text-sm text-zinc-500">Start delivering with LinkWe</p>

        <RegisterForm embedded signupKind="COURIER" />
      </div>
    </div>
  );
}
