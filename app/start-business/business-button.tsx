"use client";
import { useActionState } from "react";
import { enableBusinessWorkspace } from "./actions";
export default function BusinessButton({ plan }: { plan?: string }) {
  const [state, action, pending] = useActionState(enableBusinessWorkspace, {});
  return <form action={action}><input type="hidden" name="plan" value={plan ?? ""}/><button disabled={pending} className="min-h-12 w-full rounded-2xl bg-[#e85a16] px-6 py-3 font-bold text-white shadow-lg shadow-orange-900/15 disabled:opacity-60">{pending ? "Preparing your workspace…" : "Create my business workspace →"}</button>{state.error && <p role="alert" className="mt-3 text-sm text-red-700">{state.error}</p>}</form>;
}
