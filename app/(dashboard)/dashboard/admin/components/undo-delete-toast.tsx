"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  countdown?: number;
};

export default function UndoDeleteToast({
  message,
  onConfirm,
  onCancel,
  countdown = 30,
}: Props) {
  const [remaining, setRemaining] = useState(countdown);
  const [executing, setExecuting] = useState(false);
  const confirmedRef = useRef(false);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    if (remaining > 0) {
      const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (remaining === 0 && !confirmedRef.current) {
      confirmedRef.current = true;
      setExecuting(true);
      void onConfirmRef.current().finally(() => {
        setExecuting(false);
      });
    }
  }, [remaining]);

  const pct = ((countdown - remaining) / countdown) * 100;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 mx-4 w-full max-w-md -translate-x-1/2">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="h-1 bg-zinc-100">
          <div
            className="h-1 transition-all duration-1000 ease-linear"
            style={{
              width: `${pct}%`,
              backgroundColor: remaining <= 5 ? "#DC2626" : "#E8820C",
            }}
          />
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: remaining <= 5 ? "#DC2626" : "#E8820C" }}
          >
            {executing ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              remaining
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">{message}</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {executing
                ? "Deleting..."
                : remaining <= 5
                  ? "Deleting in a moment..."
                  : `Deleting in ${remaining} seconds`}
            </p>
          </div>

          {!executing ? (
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-xl border-2 border-zinc-900 px-4 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
            >
              Undo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
