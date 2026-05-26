import { DashboardMetricSkeleton } from "@/components/ui/content-skeletons";
import Skeleton from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="lw-route-loading min-h-[40vh] px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardMetricSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
