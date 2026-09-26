import type { Metadata } from "next";
import Link from "next/link";
import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";
export const metadata: Metadata = { title: "Cookies & Browser Storage", description: "How LinkWe uses cookies, local storage, analytics and browser permissions, and how you can control them." };
const categories = [
  ["Sign-in and security", "Session cookies keep you signed in and help protect account access. Signing out clears your LinkWe session. Blocking these cookies can prevent sign-in, checkout and account tools from working."],
  ["Setup and preferences", "Short-lived cookies remember your intended business plan during onboarding. Your browser may also store cart preferences, interface settings, install prompts and tutorial progress."],
  ["Storefront drafts", "During business onboarding, non-sensitive storefront text may be saved in session storage, scoped to your account and that browser tab. This draft does not contain passwords or identity-document files. Closing the tab normally clears session storage."],
  ["Analytics and reliability", "When configured, Google Analytics measures page visits, feature activity and performance. Error-monitoring services such as Sentry help diagnose failures. These services may receive browser, device, network and diagnostic information."],
  ["Notifications and installed apps", "OneSignal and the browser’s push system use identifiers and storage to deliver enabled notifications. Installing LinkWe may use a service worker and browser cache. Push permission is separate from signing in or installing the app."],
  ["Maps, sign-in and payments", "Using Google sign-in, maps, embedded media or WiPay may involve the provider’s own cookies, browser storage and privacy terms. WiPay’s payment page handles card entry."],
];
export default function CookiesPage() {
  return <PublicStaticPageShell eyebrow="Privacy, explained" title="Cookies & browser storage" subtitle="What your browser remembers, why it matters and the choices you have." updated="25 September 2026" legal>
    <section><h2>Small pieces of data that keep LinkWe working</h2><p className="mt-3 text-sm text-zinc-600">Cookies, local storage, session storage and browser cache help a website remember information. Some support the service you requested; others support measurement or optional features. This page complements our <Link href="/privacy" className="font-semibold text-[#a74320] underline">Privacy Policy</Link>.</p></section>
    {categories.map(([title,text]) => <section key={title}><h2>{title}</h2><p className="mt-3 text-sm text-zinc-600">{text}</p></section>)}
    <section><h2>Your choices</h2><ul className="mt-3 list-disc space-y-3 pl-5 text-sm text-zinc-600"><li>Use your browser’s site settings to inspect, block or clear cookies and stored data for LinkWe. This can sign you out and remove unsaved drafts or preferences.</li><li>Change notification and location permissions in your browser or device settings. You can enter a location manually when the relevant map tool offers it.</li><li>Use browser privacy controls to limit third-party tracking. Clearing LinkWe data does not clear data held separately by a payment, map or sign-in provider.</li><li>Signing out or clearing browser data does not delete your account, purchase records or server-side information. Contact us for an account or privacy request.</li></ul></section>
    <section><h2>How long does storage last?</h2><p className="mt-3 text-sm text-zinc-600">Some storage lasts for a browser session; other items remain until they expire, you sign out, or you clear them. Local storage can persist until removed. Browser settings and provider changes may affect retention. Ask about a specific item at <a href="mailto:admin@linkwemall.com" className="font-semibold text-[#a74320] underline">admin@linkwemall.com</a>.</p></section>
  </PublicStaticPageShell>;
}
