import type { HTMLAttributes, ReactNode } from "react";

type Padding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: Padding;
}

const paddingMap: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export default function Card({
  children,
  hoverable = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-200/60 bg-white shadow-sm",
        paddingMap[padding],
        hoverable
          ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
