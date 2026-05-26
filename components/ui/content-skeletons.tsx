import Skeleton from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-zinc-200/60">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}

export function ShopFiltersSidebarSkeleton() {
  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="mb-4 lg:mb-0 lg:hidden">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3 px-4 py-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="space-y-2 border-t border-zinc-100 px-4 py-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </aside>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="mt-3 h-8 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Cart line items and similar horizontal product rows */
export function OrderRowSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex min-w-0 gap-5 border-b border-zinc-100 pb-5 last:border-0 last:pb-0 ${className}`}>
      <Skeleton className="h-[88px] w-[88px] shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col justify-center space-y-2 py-0.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

/** Admin / dashboard stat tiles */
export function DashboardMetricSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-10 w-32" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/** Notification dropdown rows while fetching */
export function NotificationRowSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3 w-[94%]" />
      </div>
    </div>
  );
}

export function VendorProductRowSkeleton() {
  return (
    <tr className="border-b border-zinc-100">
      <td className="py-4 pl-4">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      <td className="py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </td>
      <td className="py-4">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="py-4">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="py-4 pr-4 text-right">
        <Skeleton className="ml-auto h-8 w-20 rounded-lg" />
      </td>
    </tr>
  );
}
