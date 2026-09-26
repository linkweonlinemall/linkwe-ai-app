import { getCommissionRate, TICKET_COMMISSION_RATE, type CommissionPlan } from "@/lib/finance/commission";
import { PLAN_LIMITS, PLAN_PRICE_MINOR } from "@/lib/finance/plan-limits";

export const PUBLIC_PLANS = (["STARTER", "GROWTH", "PRO"] as const).map(id => {
  const limits = PLAN_LIMITS[id];
  return {
    id,
    name: { STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" }[id],
    description: { STARTER: "Make your first move. Build your store and start selling.", GROWTH: "More listings, more creative tools and lower selling fees.", PRO: "Room for your full catalogue, with no product or service commission." }[id],
    price: PLAN_PRICE_MINOR[id] / 100,
    products: limits.productCap === null ? "Unlimited products" : `Up to ${limits.productCap.toLocaleString("en-TT")} products`,
    services: limits.serviceCap === null ? "Unlimited services" : `Up to ${limits.serviceCap} services`,
    servicePrice: limits.serviceMaxPriceMinor === null ? "No plan price cap" : `Up to TT$${limits.serviceMaxPriceMinor / 100} per service`,
    productCommission: `${getCommissionRate("product", id) * 100}%`,
    serviceCommission: `${getCommissionRate("service", id) * 100}%`,
    ticketCommission: `${TICKET_COMMISSION_RATE * 100}%`,
    rex: limits.aiMonthlyAllowance ? `${limits.aiMonthlyAllowance.toLocaleString("en-TT")} included uses / month` : `${limits.aiLifetimeGiftAllowance} complimentary uses, once`,
    timeline: id !== "STARTER",
  };
});
export function planDestination(target: CommissionPlan, current: CommissionPlan | null) {
  const name = PUBLIC_PLANS.find(plan => plan.id === target)!.name;
  if (!current) return { href: `/register/business?plan=${target.toLowerCase()}`, label: target === "STARTER" ? "Start with Starter" : `Choose ${name}` };
  if (current === target) return { href: "/dashboard/vendor/finance?tab=plan", label: "Manage your plan" };
  if (PLAN_PRICE_MINOR[target] < PLAN_PRICE_MINOR[current]) return { href: "/contact", label: "Ask about switching" };
  return { href: `/dashboard/vendor/finance?tab=plan&upgrade=${target}`, label: `Upgrade to ${name}` };
}
