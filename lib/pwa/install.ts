export type InstallPlatform = "ios" | "android" | "mac" | "desktop";
export function detectInstallPlatform(userAgent: string, touchPoints = 0): InstallPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent) || /macintosh/i.test(userAgent) && touchPoints > 1) return "ios";
  if (/android/i.test(userAgent)) return "android";
  if (/macintosh|mac os x/i.test(userAgent) && /safari/i.test(userAgent) && !/chrome|edg/i.test(userAgent)) return "mac";
  return "desktop";
}
export const INSTALL_GUIDES: Record<InstallPlatform, { label: string; title: string; steps: string[]; note: string }> = {
  ios: { label: "iPhone / iPad", title: "A place on your Home Screen.", steps: ["Open LinkWe in Safari and tap Share. You may find Share inside the More menu.", "Choose Add to Home Screen. If shown, turn on Open as Web App.", "Tap Add, then open the LinkWe icon from your Home Screen."], note: "If this browser hides the Share option, copy the link below and open it in Safari." },
  android: { label: "Android", title: "Your marketplace, one tap away.", steps: ["Open LinkWe in Chrome on your phone.", "Tap Install app above, when available. Otherwise open the browser menu and choose Install app or Add to Home screen.", "Confirm in your browser, then open LinkWe from your home screen or app drawer."], note: "Your browser decides when the install prompt is available. You can always use its menu instead." },
  mac: { label: "Mac / Safari", title: "Give LinkWe a spot in your Dock.", steps: ["Open LinkWe in Safari on your Mac.", "On supported versions of macOS, choose File → Add to Dock, or use the Share menu.", "Confirm the name and choose Add. Open LinkWe from your Dock."], note: "If Add to Dock is unavailable, try an up-to-date Chrome or Edge browser, or keep using LinkWe on the web." },
  desktop: { label: "Computer", title: "A window into everything local.", steps: ["Open LinkWe in Chrome or Edge.", "Tap Install app above, when available, or look for the install icon in the address bar or the browser’s app menu.", "Confirm the browser prompt, then launch LinkWe from your computer’s apps."], note: "Some browsers and embedded previews don’t offer installation. Open this link in Chrome or Edge if you don’t see an install option." },
};
