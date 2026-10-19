// Shared timing and cancellation for the Academy. No form or scroll state is changed here.
export const tutorialMotion = { panel: 260, content: 180, exit: 140, easing: "cubic-bezier(.22, 1, .36, 1)" };
const running = new WeakMap<Element, Animation>();

export function cancelTutorialMotion(element: Element | null) {
  if (element) running.get(element)?.cancel();
}

export function animateTutorialElement(element: HTMLElement | null, frames: Keyframe[], duration = tutorialMotion.content): Animation | null {
  if (!element) return null;
  cancelTutorialMotion(element);
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  if (preference.matches || !element.animate) return null;
  const animation = element.animate(frames, { duration, easing: tutorialMotion.easing });
  running.set(element, animation);
  // Respect a preference change while an animation is already running.
  const reduce = () => { if (preference.matches) animation.finish(); };
  preference.addEventListener("change", reduce);
  const clean = () => {
    preference.removeEventListener("change", reduce);
    if (running.get(element) === animation) running.delete(element);
  };
  void animation.finished.then(clean, clean);
  return animation;
}
