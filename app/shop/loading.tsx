import { ProductCardSkeleton, ShopFiltersSidebarSkeleton } from "@/components/ui/content-skeletons";
import Skeleton from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="lw-route-loading min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <ShopFiltersSidebarSkeleton />
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
