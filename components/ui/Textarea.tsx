import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={textareaId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          className={[
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-zinc-800",
            "placeholder:text-zinc-400 min-h-[100px] resize-y",
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

Textarea.displayName = "Textarea";
export default Textarea;
