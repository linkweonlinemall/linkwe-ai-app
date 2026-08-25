"use client";

import { useState } from "react";

import { verifyWiPayCardAndContinue } from "@/app/actions/wipay-subscription";

export default function VerifyCardForm({ enrollmentId }: { enrollmentId: string }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const result = await verifyWiPayCardAndContinue(enrollmentId, Number(amount));
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.assign(result.checkoutUrl);
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-zinc-800">
        Verification charge (USD)
        <div className="mt-1 flex items-center rounded-xl border border-zinc-300 bg-white px-3 focus-within:ring-2 focus-within:ring-orange-500">
          <span className="text-zinc-500">$</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="min-h-11 w-full bg-transparent px-2 outline-none"
          />
        </div>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading || !amount}
        className="min-h-11 w-full rounded-xl bg-[#D4450A] px-4 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify and continue"}
      </button>
    </div>
  );
}
