"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { transferTicket } from "@/app/actions/my-tickets";
import type { TicketStatus } from "@prisma/client";

type Props = {
  ticketId: string;
  status: TicketStatus;
};

export function TransferTicketPanel({ ticketId, status }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canTransfer = status === "VALID";

  function handleCancel() {
    setOpen(false);
    setHolderName("");
    setHolderEmail("");
    setError(null);
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await transferTicket(ticketId, holderName, holderEmail);

      if (!result.ok) {
        setError(result.reason ?? "Could not transfer this ticket.");
        return;
      }

      const name = holderName.trim();
      setSuccess(
        result.emailNote
          ? `Transferred to ${name}. ${result.emailNote}`
          : `Transferred to ${name}. A new ticket has been emailed to them.`,
      );
      setOpen(false);
      setHolderName("");
      setHolderEmail("");
      router.refresh();
    });
  }

  if (!canTransfer) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl border-2 border-zinc-200 bg-zinc-50 px-6 py-3 text-base font-semibold text-zinc-400"
      >
        Used/cancelled tickets can&apos;t be transferred
      </button>
    );
  }

  return (
    <div>
      {success ? (
        <p
          className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          {success}
        </p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-[#D4450A] bg-white px-6 py-3 text-base font-semibold text-[#D4450A] transition-colors hover:bg-[#FEF0EB]"
        >
          Transfer this ticket
        </button>
      ) : (
        <form
          onSubmit={handleConfirm}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-bold text-[#1C1C1A]">Transfer ticket</h2>
          <p className="mt-2 text-sm text-zinc-600">
            This issues a new ticket to the new holder and invalidates your current QR code.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="transfer-holder-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400"
              >
                New holder name
              </label>
              <input
                id="transfer-holder-name"
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-[#1C1C1A] outline-none ring-[#D4450A] focus:border-[#D4450A] focus:ring-2"
                placeholder="Full name"
              />
            </div>
            <div>
              <label
                htmlFor="transfer-holder-email"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400"
              >
                New holder email
              </label>
              <input
                id="transfer-holder-email"
                type="email"
                value={holderEmail}
                onChange={(e) => setHolderEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-[#1C1C1A] outline-none ring-[#D4450A] focus:border-[#D4450A] focus:ring-2"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#D4450A] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Transferring…" : "Confirm transfer"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
