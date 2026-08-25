import RouteLoadingLogo from "@/components/ui/RouteLoadingLogo";

export default function ShopLoading() {
  return (
    <div className="lw-route-loading min-h-screen bg-[#F5F5F5] pb-mobile-public lg:pb-0">
      <RouteLoadingLogo label="Loading products" />
    </div>
  );
}
