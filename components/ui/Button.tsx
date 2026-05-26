import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import InlineSpinner from "@/components/ui/InlineSpinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex flex-row items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[#D4450A] text-white hover:bg-[#B83A09] active:bg-[#932F07] focus-visible:ring-[#D4450A]",
  secondary:
    "border border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-400 focus-visible:ring-zinc-400",
  ghost:
    "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-zinc-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",
  link:
    "text-[#1A7FB5] hover:text-[#156A97] hover:underline underline-offset-2 focus-visible:ring-[#1A7FB5] px-0 py-0 rounded-none font-medium",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const isLink = variant === "link";
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[base, variants[variant], isLink ? "" : sizes[size], fullWidth ? "w-full" : "", className]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && <InlineSpinner className="-ml-0.5 h-4 w-4" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
