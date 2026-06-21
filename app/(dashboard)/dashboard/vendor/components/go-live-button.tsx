"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setStoreLive } from "@/app/actions/vendor-verification";

export default function GoLiveButton({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      const result = await setStoreLive(storeId);
      if (result.ok) {
        router.refresh();
        return;
      }
      if (result.reason === "not_verified") {
        setError("Complete identity verification before going live.");
      } else {
        setError("Could not publish your store. Try again or contact support.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void handleClick()}
        className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Go live"}
      </button>
      {error ? (
        <p className="text-[10px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
