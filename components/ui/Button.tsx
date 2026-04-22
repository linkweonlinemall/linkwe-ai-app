import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

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
  "inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

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
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

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
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
