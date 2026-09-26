import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import PublicStaticPageShell from "@/components/layout/PublicStaticPageShell";
import { getSession } from "@/lib/auth/session";
import { resolveVendorPlan } from "@/lib/finance/vendor-plan";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PLANS, planDestination } from "@/lib/pricing/catalog";
import s from "./pricing.module.css";

export const metadata: Metadata = { title: "Plans & Pricing", description: "Compare LinkWe Starter, Growth and Pro. See monthly prices in TTD, selling commission, listing limits and Rex allowances." };
const common = ["Your branded storefront", "Products, services, events & tickets", "Orders, messages & customer reviews", "Finance, bank details & payout tools", "QR Studio & guided tutorials", "Staff, schedules & collaboration tools"];
const faqs = [
  ["What will I pay?", "Starter has no monthly subscription fee. Growth and Pro have the monthly price shown above. Commission applies to eligible sales at your plan’s rate; event ticket commission is 6% on every plan. Delivery, optional top-ups and any bank or provider charges shown at payment are separate."],
  ["Can I change plans?", "Use Finance → Plan & Rex to manage your subscription or upgrade. Upgrades use the price shown before payment; do not assume a prorated credit. Contact support to downgrade. Cancelling a renewal does not automatically refund a paid period."],
  ["How does Rex’s allowance work?", "Starter includes a one-time welcome allowance. Growth and Pro include a monthly allowance. Your workspace shows remaining included use as a percentage, with purchased top-ups separate. Current top-up pricing appears in Finance before you pay."],
  ["Can customers pay for services on arrival?", "Eligible non-virtual bookings from an active Growth or Pro store can offer pay on arrival, depending on the service’s settings. The customer sees the available choices before confirming. Money collected directly by a provider is outside the LinkWe payout balance."],
  ["Do I need to upload ID straight away?", "You can skip identity upload while setting up a draft store. Return to the dashboard checklist to complete verification and any other launch requirements before your store becomes sellable."],
  ["How do payouts work?", "Eligible online earnings are released under the relevant fulfilment rules. Request a payout from Finance using verified bank details. Your available balance, the displayed minimum, refunds and other applicable holds affect eligibility."],
];
export default async function PricingPage() {
  const session = await getSession();
  const store = session?.role === "VENDOR" ? await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { subscriptionPlan: true } }) : null;
  const current = store ? resolveVendorPlan(store.subscriptionPlan) : null;
  return <PublicStaticPageShell eyebrow="Built for your next chapter" title="Start small. Grow your way." subtitle="Straightforward plans for Trinidad & Tobago businesses. Choose the tools and selling rates that fit where you are today." wide>
    <div className={s.intro}><span><span className={s.dot}/> All prices in Trinidad & Tobago dollars</span><a href="#compare">Compare every plan <ArrowRight size={14}/></a></div>
    <div className={s.plans}>{PUBLIC_PLANS.map(plan => { const cta = planDestination(plan.id,current); return <section key={plan.id} className={`${s.plan} ${plan.id === "GROWTH" ? s.featured : ""}`}><div className={s.planTop}><p>{plan.name}</p>{current === plan.id ? <span>Your plan</span> : plan.id === "GROWTH" ? <span><Sparkles size={12}/> Room to grow</span> : null}</div><p className={s.description}>{plan.description}</p><div className={s.price}>{plan.price === 0 ? "Free" : <><span>TT$</span>{plan.price}</>}<small>{plan.price === 0 ? "No monthly fee" : "per month"}</small></div><div className={s.commission}><div><strong>{plan.productCommission}</strong><span>Product commission</span></div><div><strong>{plan.serviceCommission}</strong><span>Service commission</span></div></div><Link href={cta.href} className={s.cta}>{cta.label}<ArrowRight size={16}/></Link><ul>{[plan.products, `${plan.services} · ${plan.servicePrice}`, `Rex: ${plan.rex}`, plan.timeline ? "Publish shoppable Timeline posts" : "Storefront & marketplace discovery", `Event tickets · ${plan.ticketCommission} commission`].map(text => <li key={text}><Check size={15}/><span>{text}</span></li>)}</ul></section>; })}</div>
    <section className={s.shared}><div><p className={s.kicker}>A strong foundation</p><h2>Every plan starts here.</h2><Link href="/features">Explore all LinkWe features <ArrowRight size={15}/></Link></div><ul>{common.map(text => <li key={text}><Check size={16}/>{text}</li>)}</ul></section>
    <section id="compare" className={s.compare}><p className={s.kicker}>The details, side by side</p><h2>Find your fit.</h2><p className={s.hint}>On smaller screens, swipe the table to compare plans.</p><div className={s.tableWrap} tabIndex={0} role="region" aria-label="Scrollable plan comparison"><table><caption className="sr-only">LinkWe plan prices, commission and allowances</caption><thead><tr><th scope="col">What’s included</th>{PUBLIC_PLANS.map(p => <th scope="col" key={p.id}>{p.name}</th>)}</tr></thead><tbody>{[
      ["Monthly subscription", ...PUBLIC_PLANS.map(p => p.price ? `TT$${p.price}` : "Free")],
      ["Product commission", ...PUBLIC_PLANS.map(p => p.productCommission)],
      ["Service commission", ...PUBLIC_PLANS.map(p => p.serviceCommission)],
      ["Event ticket commission", ...PUBLIC_PLANS.map(p => p.ticketCommission)],
      ["Product listings", ...PUBLIC_PLANS.map(p => p.products)],
      ["Service listings", ...PUBLIC_PLANS.map(p => p.services)],
      ["Service price limit", ...PUBLIC_PLANS.map(p => p.servicePrice)],
      ["Rex allowance", ...PUBLIC_PLANS.map(p => p.rex)],
      ["Timeline publishing", ...PUBLIC_PLANS.map(p => p.timeline ? "Included while active" : "Growth or Pro required")],
      ["Eligible pay-on-arrival bookings", "Online payment only", "Available while active", "Available while active"],
    ].map(([label,...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value,i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table></div><p className={s.footnote}>Listing limits, approval and feature-specific conditions apply. Photo Studio has separate image allowances and availability controls, shown inside the tool. A subscription does not guarantee sales or featured placement.</p></section>
    <section className={s.faq}><div><p className={s.kicker}>Before you decide</p><h2>A little clarity<br/>goes a long way.</h2><Link href="/contact">Talk to the LinkWe team <ArrowRight size={15}/></Link></div><div>{faqs.map(([q,a]) => <details key={q}><summary>{q}<ChevronDown size={17}/></summary><p>{a}</p></details>)}</div></section>
    <div className={s.end}><h2>Your business belongs here.</h2><p>Build your draft storefront, explore the tools and take your next step.</p><Link href={store ? "/dashboard/vendor" : "/register/business"}>{store ? "Open your workspace" : "Create your business account"}<ArrowRight size={16}/></Link><span>By subscribing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></div>
  </PublicStaticPageShell>;
}
