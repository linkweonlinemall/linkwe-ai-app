"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleWishlistItem } from "@/app/actions/wishlist";

type Props = {
  productId: string;
  initialWishlisted: boolean;
  size?: "sm" | "md";
};

export default function WishlistButton({ productId, initialWishlisted, size = "md" }: Props) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const result = await toggleWishlistItem(productId);
    if ("error" in result) {
      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }
    } else {
      setWishlisted(result.wishlisted);
    }
    setLoading(false);
  }

  const sizeClasses = size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center justify-center rounded-full transition-all disabled:opacity-50 ${sizeClasses} ${
        wishlisted
          ? "bg-[#D4450A] text-white shadow-md"
          : "bg-white/90 text-zinc-400 shadow-sm backdrop-blur-sm hover:bg-white hover:text-[#D4450A]"
      }`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
