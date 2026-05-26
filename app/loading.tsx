import { StoreCardSkeleton } from "@/components/ui/content-skeletons";
import Skeleton from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="lw-route-loading min-h-[50vh] bg-[#F5F5F5] px-4 py-10">
      <div className="mx-auto max-w-screen-xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 max-w-xs" />
          <Skeleton className="h-5 max-w-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
