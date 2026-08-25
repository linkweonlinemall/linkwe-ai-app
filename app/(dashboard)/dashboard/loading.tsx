import RouteLoadingLogo from "@/components/ui/RouteLoadingLogo";

export default function DashboardLoading() {
  return (
    <div className="lw-route-loading min-h-[40vh] bg-[#F7F5F2]">
      <RouteLoadingLogo label="Loading dashboard" />
    </div>
  );
}
