"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeFromCart } from "@/app/actions/cart";
import { tw } from "@/lib/design-system";
import { toastRemovedFromCart } from "@/lib/feedback/toasts";

type Props = {
  cartItemId: string;
  productName: string;
};

export default function CartRemoveButton({ cartItemId, productName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await removeFromCart(cartItemId);
      toastRemovedFromCart(productName);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleClick()}
      className={`text-xs font-semibold text-zinc-400 transition-colors duration-200 ease-in-out hover:underline disabled:opacity-50 ${tw.hoverTextDanger}`}
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
