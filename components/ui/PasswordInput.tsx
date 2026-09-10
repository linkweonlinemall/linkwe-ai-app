"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return <div className="relative">
      <input ref={ref} {...props} disabled={disabled} type={visible ? "text" : "password"} className={`${className} pr-12`} />
      <button type="button" disabled={disabled} onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex min-h-11 w-11 items-center justify-center rounded-r-xl text-zinc-400 transition hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4450A] disabled:opacity-40">
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>;
  },
);

PasswordInput.displayName = "PasswordInput";
export default PasswordInput;
