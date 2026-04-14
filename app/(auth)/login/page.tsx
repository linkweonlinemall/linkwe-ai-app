import Image from "next/image";
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
    <>
      <div className="mb-6 flex justify-center">
        <Image alt="LinkWe" className="object-contain" height={60} src="/linkwe-logo.png" width={180} />
      </div>
      <LoginForm callbackUrl={callbackUrl} />
    </>
  );
}

