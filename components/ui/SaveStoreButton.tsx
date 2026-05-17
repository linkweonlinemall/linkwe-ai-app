"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleSavedStore } from "@/app/actions/wishlist";

type Props = {
  storeId: string;
  initialSaved: boolean;
};

export default function SaveStoreButton({ storeId, initialSaved }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    const result = await toggleSavedStore(storeId);
    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
    } else {
      setSaved(result.saved);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${
        saved
          ? "border-[#D4450A] bg-[#D4450A] text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-[#D4450A] hover:text-[#D4450A]"
      }`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {saved ? "Saved" : "Save store"}
    </button>
  );
}
