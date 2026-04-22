import type { ReactNode } from "react";

type BadgeVariant =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "draft"
  | "info"
  | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  draft: "bg-zinc-100 text-zinc-600",
  info: "bg-blue-100 text-blue-600",
  warning: "border border-amber-200 bg-amber-50 text-amber-600",
};

export default function Badge({ variant = "draft", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantMap[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
