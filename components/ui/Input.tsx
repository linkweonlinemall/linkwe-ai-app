import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-800",
            "placeholder:text-zinc-400",
            "transition-colors duration-150 outline-none",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              : "border-zinc-300 focus:border-[#1A7FB5] focus:ring-2 focus:ring-blue-200",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
