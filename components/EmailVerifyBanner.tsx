"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "email-verify-banner-dismissed";

export default function EmailVerifyBanner({ emailVerified }: { emailVerified: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (emailVerified || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-6"
    >
      <p className="leading-snug">
        Please verify your email to secure your account. Check your inbox for the verification link.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-lg leading-none text-amber-700 hover:text-amber-900"
      >
        &times;
      </button>
    </div>
  );
}
