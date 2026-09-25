// Keep dashboard navigation fixed when bringing a detail panel into view.
// scrollIntoView also scrolls overflow-hidden ancestors above the workspace.
export function scrollDeskPanel(element: HTMLElement | null, position: "start" | "nearest" = "start") {
  const container = element?.closest<HTMLElement>(".vendor-main-scroll");
  if (!element || !container) return;
  const target = element.getBoundingClientRect();
  const viewport = container.getBoundingClientRect();
  const padding = 16;
  let offset = target.top - viewport.top - padding;
  if (position === "nearest" && target.top >= viewport.top + padding) {
    if (target.bottom <= viewport.bottom - padding) return;
    offset = Math.min(offset, target.bottom - viewport.bottom + padding);
  }
  container.scrollTo({
    top: container.scrollTop + offset,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}
