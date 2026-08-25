import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import VerifyCardForm from "./verify-card-form";

export default async function VerifyWiPayCardPage({
  searchParams,
}: {
  searchParams: Promise<{ enrollment?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { enrollment } = await searchParams;
  if (!enrollment) redirect("/");

  return (
    <main className="mx-auto min-h-[70vh] max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900">Verify your card</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          WiPay made a small USD verification charge. Check your bank notification or statement,
          then enter the exact amount below. This securely saves the card for future WiPay renewal checkouts.
        </p>
        <VerifyCardForm enrollmentId={enrollment} />
      </div>
    </main>
  );
}
