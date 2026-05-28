import { IconShieldCheck, IconStar } from "@tabler/icons-react";

type Props = {
  productCount: number;
  serviceCount: number;
  averageRating: number;
  reviewCount: number;
  isVerified: boolean;
};

function StatCell({
  value,
  label,
  withDivider,
}: {
  value: React.ReactNode;
  label: string;
  withDivider?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center py-3 text-center ${
        withDivider
          ? "before:absolute before:left-0 before:top-1/2 before:h-8 before:w-px before:-translate-y-1/2 before:bg-[var(--color-border-tertiary)] before:content-['']"
          : ""
      }`}
    >
      <div className="text-[17px] font-medium text-[var(--text-primary)]">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
        {label}
      </div>
    </div>
  );
}

export default function StoreStatsBar({
  productCount,
  serviceCount,
  averageRating,
  reviewCount,
  isVerified,
}: Props) {
  const ratingDisplay =
    reviewCount > 0 ? (
      <span className="inline-flex items-center justify-center gap-1">
        <IconStar className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
        {averageRating.toFixed(1)}
      </span>
    ) : (
      "—"
    );

  return (
    <div className="grid grid-cols-2 border-b border-[0.5px] border-[var(--color-border-tertiary)] bg-white md:grid-cols-4">
      <StatCell value={productCount} label="Products" />
      <StatCell value={serviceCount} label="Services" withDivider />
      <StatCell value={ratingDisplay} label="Rating" withDivider />
      <StatCell
        value={
          isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-[20px] bg-[#EAF3DE] px-2.5 py-[3px] text-xs font-semibold text-[#3B6D11]">
              <IconShieldCheck className="size-3.5" stroke={1.75} aria-hidden />
              Verified
            </span>
          ) : (
            "—"
          )
        }
        label="Status"
        withDivider
      />
    </div>
  );
}
