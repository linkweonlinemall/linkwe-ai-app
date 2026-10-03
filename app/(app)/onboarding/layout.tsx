import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/auth-actions";
import s from "@/components/onboarding/onboarding.module.css";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.page}><header className={s.header}><Link className={s.brand} href="/" aria-label="LinkWe home"><Image src="/branding/v2/mark-192.png" alt="" width={46} height={46} preload/></Link><div className={s.headerActions}><Link href="/contact">Need a hand?</Link><form action={logoutAction}><button type="submit">Sign out</button></form></div></header>{children}</div>;
}
