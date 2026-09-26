import Link from "next/link";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import s from "./onboarding.module.css";

const steps = [
  { name: "Your plan", href: "/onboarding/business/plan" },
  { name: "About you", href: "/onboarding/business/step-1" },
  { name: "Identity", href: "/onboarding/business/step-2", note: "You can do this later" },
  { name: "Storefront", href: "/onboarding/business/step-3" },
];

export default function OnboardingFrame({ step, title, description, children, panel = true }: {
  step: 1 | 2 | 3 | 4; title: string; description: string; children: ReactNode; panel?: boolean;
}) {
  return <div className={s.layout}>
    <aside className={s.aside}><p className={s.kicker}>A new beginning</p><h2>A little setup.<br/><em>A lot of possibility.</em></h2>
      <nav aria-label="Business setup steps"><ol className={s.steps}>{steps.map((item, index) => {
        const content = <><span className={s.stepCircle}>{index + 1}</span><span>{item.name}{item.note && <small>{item.note}</small>}</span></>;
        return <li key={item.href}>{index < step - 1 ? <Link className={s.step} data-past="true" href={item.href}>{content}</Link> : <span className={s.step} data-current={index === step - 1} aria-current={index === step - 1 ? "step" : undefined}>{content}</span>}</li>;
      })}</ol></nav>
      <div className={s.asideNote}><Leaf size={23}/><strong>Room to start small.</strong>Set up the essentials now. Add your photos, products, services and finishing touches in your dashboard.</div>
    </aside>
    <main className={s.main} key={step} id="onboarding-content"><div className={s.progressLabel}><span>Step {step} of 4</span><span>{steps[step - 1].name}</span></div><div className={s.track} aria-hidden="true"><div style={{width:`${step / 4 * 100}%`}}/></div><h1>{title}</h1><p className={s.intro}>{description}</p><div className={panel ? s.panel : undefined}>{children}</div><p className={s.finePrint}>Built for our people. Ready for your business.</p></main>
  </div>;
}
