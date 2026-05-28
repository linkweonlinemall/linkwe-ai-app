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
      className={`relative flex flex-col items-center justify-center py-2 text-center md:py-3 ${
        withDivider
          ? "before:absolute before:left-0 before:top-1/2 before:h-8 before:w-px before:-translate-y-1/2 before:bg-[var(--color-border-tertiary)] before:content-['']"
          : ""
      }`}
    >
      <div className="text-sm font-medium text-[var(--text-primary)] md:text-[17px]">{value}</div>
      <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)] md:mt-1 md:text-[10px]">
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
        <IconStar className="size-3 fill-amber-400 text-amber-400 md:size-3.5" aria-hidden />
        {averageRating.toFixed(1)}
      </span>
    ) : (
      "—"
    );

  return (
    <div className="grid grid-cols-4 border-b border-[0.5px] border-[var(--color-border-tertiary)] bg-white">
      <StatCell value={productCount} label="Products" />
      <StatCell value={serviceCount} label="Services" withDivider />
      <StatCell value={ratingDisplay} label="Rating" withDivider />
      <StatCell
        value={
          isVerified ? (
            <span className="inline-flex items-center gap-0.5 rounded-[20px] bg-[#EAF3DE] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#3B6D11] md:gap-1 md:px-2.5 md:py-[3px] md:text-xs">
              <IconShieldCheck className="size-3 shrink-0 md:size-3.5" stroke={1.75} aria-hidden />
              <span className="max-md:text-[9px]">Verified</span>
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
