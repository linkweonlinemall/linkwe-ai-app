import type { SVGProps } from "react";

/** Small inline spinner for primary buttons — 200ms motion matches platform polish */
export default function InlineSpinner({ className = "h-4 w-4" }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={`shrink-0 animate-spin opacity-90 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-85"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
