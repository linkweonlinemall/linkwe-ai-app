import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveAuthLandingPath } from "@/lib/auth/landing";
import { RegisterForm } from "@/app/(auth)/register/register-form";

export default async function RegisterBusinessPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(await resolveAuthLandingPath(user));
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image alt="LinkWe" className="object-contain" height={60} src="/linkwe-logo.png" width={180} />
        </div>
        <RegisterForm signupKind="BUSINESS" />
      </div>
    </div>
  );
}
