import { formatTTDPrice } from "@/lib/format/price";
import { formatSubscriptionIntervalDisplay } from "@/lib/finance/subscription-interval";

export type StorefrontServiceDetails = {
  price: number;
  serviceType?: string | null;
  quotePriceType?: string | null;
  subscriptionInterval?: string | null;
  serviceLocation?: string | null;
};

export function storefrontServicePrice(service: StorefrontServiceDetails): string {
  const price = formatTTDPrice(service.price);
  if (service.serviceType === "QUOTE") {
    if (service.quotePriceType === "CALLOUT_FEE") return `${price} call-out fee`;
    if (service.quotePriceType === "STARTING_FROM") return `From ${price}`;
    return "Request a quote";
  }
  if (service.serviceType === "SUBSCRIPTION") return `${price} ${formatSubscriptionIntervalDisplay(service.subscriptionInterval)}`;
  return price;
}

export function storefrontServiceLocation(location?: string | null) {
  const labels: Record<string, string> = { AT_VENDOR: "At the provider", AT_CUSTOMER: "At your location", VIRTUAL: "Online", FLEXIBLE: "Flexible location" };
  return location ? labels[location] ?? location.replaceAll("_", " ") : null;
}
