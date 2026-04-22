import { forwardRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = "", id, children, ...props }, ref) => {
    const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              "w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-9 text-sm text-zinc-800",
              "transition-colors duration-150 outline-none",
              error
                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                : "border-zinc-300 focus:border-[#1A7FB5] focus:ring-2 focus:ring-blue-200",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
