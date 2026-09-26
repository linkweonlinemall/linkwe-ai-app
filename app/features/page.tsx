import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";
import FeatureDirectory from "./FeatureDirectory";
import s from "./features.module.css";
export const metadata: Metadata = { title: "All LinkWe Features", description: "Explore LinkWe’s marketplace, business tools, Rex, QR Studio, services, events, payments and customer dashboard." };
export default function FeaturesPage() {
  return <PublicStaticPageShell eyebrow="The LinkWe toolkit" title="So much more than a marketplace." subtitle="Shop local. Book something useful. Build your business. Discover the tools that bring our people and businesses together." wide>
    <div className={s.intro}><p>One connected home for customers, independent businesses, service providers and event organisers. Find what you need below, then make it yours.</p><Link href="/pricing">Find your plan <ArrowUpRight size={17}/></Link></div>
    <FeatureDirectory/>
    <p className={s.footer}>Business features depend on your plan, account role, store approval and listing eligibility. Check <Link href="/pricing">current plans</Link> for allowances. Availability may vary by listing or device. Need help finding your way? <Link href="/contact">Talk to LinkWe.</Link></p>
  </PublicStaticPageShell>;
}
