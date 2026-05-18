"use client";

import { useState } from "react";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function StarRating({ value, onChange, readonly = false, size = "md" }: Props) {
  const [hovered, setHovered] = useState(0);

  const sizeClass = size === "sm" ? "text-sm" : size === "lg" ? "text-3xl" : "text-xl";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={`transition-transform ${!readonly ? "cursor-pointer hover:scale-110" : "cursor-default"} ${sizeClass}`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-[1em] w-[1em] transition-colors ${
                filled ? "fill-[#E8820C] stroke-[#E8820C]" : "fill-zinc-200 stroke-zinc-300"
              }`}
              strokeWidth="1"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
