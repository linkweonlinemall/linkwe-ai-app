"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { toggleWishlistItem } from "@/app/actions/wishlist";
import Skeleton from "@/components/ui/skeleton";

type Props = {
  productId: string;
  initialWishlisted: boolean;
  size?: "sm" | "md";
  /** Full-width PDP row — heart left, rounded-md */
  variant?: "icon" | "outline";
};

export default function WishlistButton({
  productId,
  initialWishlisted,
  size = "md",
  variant = "icon",
}: Props) {
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

  const heart = loading ? (
    <Skeleton className="h-4 w-4 shrink-0 rounded-full md:h-3.5 md:w-3.5" />
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={wishlisted ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  if (variant === "outline") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`flex h-12 w-full items-center justify-start gap-2 rounded-md border border-gray-300 bg-white px-4 font-sans text-sm font-semibold shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 ${
          wishlisted ? "border-[#D4450A]/50 bg-rose-50/50 text-[#D4450A]" : "text-zinc-900 hover:border-gray-400"
        }`}
      >
        {loading ? (
          <Skeleton className="h-4 w-4 shrink-0 rounded-full md:h-3.5 md:w-3.5" />
        ) : (
          <Heart
            className={`size-[18px] shrink-0 ${wishlisted ? "fill-[#D4450A] stroke-[#D4450A]" : "fill-none stroke-zinc-500"}`}
            strokeWidth={2}
            aria-hidden
          />
        )}
        {wishlisted ? "Saved for later" : "Save for later"}
      </button>
    );
  }

  const sizeClasses = size === "sm" ? "h-7 w-7 text-base" : "h-9 w-9 text-lg";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all duration-200 ease-in-out disabled:opacity-50 ${sizeClasses} ${
        wishlisted
          ? "bg-[#D4450A] text-white shadow-md hover:bg-[#B83A09]"
          : "bg-white/90 text-zinc-400 hover:bg-white hover:text-[#D4450A]"
      }`}
    >
      {heart}
    </button>
  );
}
