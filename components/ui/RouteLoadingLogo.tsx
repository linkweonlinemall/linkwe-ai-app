import StartupSplashVisual from "@/components/layout/StartupSplashVisual";

export default function RouteLoadingLogo({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="relative min-h-[100dvh]" role="status" aria-live="polite">
      <StartupSplashVisual label={label.endsWith("…") ? label : `${label}…`} />
    </div>
  );
}
