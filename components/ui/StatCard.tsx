import type { ReactNode } from "react";

import Card from "./Card";

interface TrendProps {
  value: string;
  positive: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: TrendProps;
  icon?: ReactNode;
  className?: string;
}

export default function StatCard({ label, value, sublabel, trend, icon, className = "" }: StatCardProps) {
  return (
    <Card className={className} padding="lg">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-zinc-900">{value}</p>
          {sublabel ? <p className="mt-1 text-xs text-zinc-500">{sublabel}</p> : null}
          {trend ? (
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={`text-xs font-medium ${trend.positive ? "text-green-600" : "text-red-500"}`}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            </div>
          ) : null}
        </div>
        {icon ? (
          <div className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2EE] text-[#D4450A]">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
