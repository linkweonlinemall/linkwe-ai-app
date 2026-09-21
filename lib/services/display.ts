import type { Product } from "@prisma/client";
import { formatTTDPrice } from "../format/price";
import { formatSubscriptionIntervalDisplay } from "../finance/subscription-interval";

type ServiceFields = "serviceType" | "serviceLocation" | "serviceDuration" | "durationMinutes" | "requiresDeposit" | "depositAmount" | "requiresApproval" | "bookingPaymentMode" | "advanceBookingDays" | "cancellationHours" | "quotePriceType" | "responseTime" | "minimumQuoteAmount" | "siteVisitRequired" | "subscriptionInterval" | "sessionsIncluded" | "subscriptionCancellationDays" | "subscriptionTrialPeriod" | "subscriptionTrialPrice" | "subscriptionCanPause" | "subscriptionPauseMaxWeeks" | "travelFee" | "serviceRadius" | "estimatedResponseMins" | "virtualPlatform" | "virtualMeetingInfo" | "maxGroupSize" | "isAvailable";
export type ServiceDisplayData = Pick<Product, "id" | "name" | "slug" | "price" | "compareAtPrice" | "images" | "description" | "shortDescription" | "category" | "tags" | "storeId" | "isFeatured"> & Partial<Pick<Product, ServiceFields | "address" | "latitude" | "longitude" | "returnPolicy">> & {
  store: { id: string; name: string; slug: string; logoUrl: string | null; region: string | null; address?: string | null; latitude?: number | null; longitude?: number | null; policies?: string | null; isAvailableNow?: boolean };
};
export type ServiceRecommendation = Pick<ServiceDisplayData, "id" | "name" | "slug" | "images" | "price" | "serviceType" | "quotePriceType" | "subscriptionInterval" | "store">;
type ServicePricing = Pick<ServiceDisplayData, "price" | "serviceType" | "quotePriceType" | "subscriptionInterval">;
export function servicePrice(service: ServicePricing) {
  if (service.serviceType === "QUOTE") {
    if (service.quotePriceType === "FREE_QUOTE") return { label: "Free quote", note: "A custom price for what you need" };
    if (service.quotePriceType === "CALLOUT_FEE") return { label: formatTTDPrice(service.price), note: "Call-out fee · final price after assessment" };
    if (service.quotePriceType === "STARTING_FROM") return { label: `From ${formatTTDPrice(service.price)}`, note: "Starting price · your provider confirms the total" };
    return { label: service.price > 0 ? formatTTDPrice(service.price) : "Request a quote", note: "Your provider confirms the final price" };
  }
  return { label: formatTTDPrice(service.price), note: service.serviceType === "SUBSCRIPTION" ? formatSubscriptionIntervalDisplay(service.subscriptionInterval) : service.serviceType === "ON_DEMAND" ? "Service price · travel fee listed below, if applicable" : "Per session" };
}
export function serviceTypeInfo(type: string | null | undefined) {
  switch (type) {
    case "BOOKABLE": return { label: "By appointment", action: "Choose a time", heading: "Make time for you.", intro: "Find an available date and time, then review your booking.", steps: [["Find your time", "Choose a date and an available appointment."], ["Review the details", "Check the price, payment options and any booking requirements."], ["You’re all set", "Follow your booking status in your account."]] };
    case "VIRTUAL": return { label: "Online session", action: "Book a session", heading: "Connect from anywhere.", intro: "Choose your session time. All times are shown in Trinidad & Tobago time (AST).", steps: [["Pick your session", "Choose an available date and time in AST."], ["Review & book", "Check your session details and payment options."], ["Meet online", "Follow the provider’s instructions to join your session."]] };
    case "QUOTE": return { label: "Tailored to you", action: "Request a quote", heading: "Let’s make it happen.", intro: "Tell the provider what you have in mind. They’ll put together a quote for you.", steps: [["Share your idea", "Describe what you need and add photos if they help."], ["Get your quote", "Your provider responds with a price for your request."], ["Make it happen", "Review the quote and arrange the next steps with your provider."]] };
    case "SUBSCRIPTION": return { label: "Recurring service", action: "View subscription", heading: "A little more, regularly.", intro: "Review what’s included, the billing cycle and subscription terms below.", steps: [["Know your plan", "Review the included sessions, price and billing cycle."], ["Start your subscription", "Check the payment details before confirming."], ["Stay in control", "Manage your subscription from your account."]] };
    case "ON_DEMAND": return { label: "On demand", action: "Request service", heading: "Good help. On call.", intro: "Send your location and what you need. Your provider will review the request.", steps: [["Tell us what’s needed", "Describe the job and where you need help."], ["Send your request", "Your provider reviews the details and availability."], ["Follow the progress", "Keep track of the response in your account."]] };
    default: return { label: "Local service", action: "Contact provider", heading: "Find your kind of expert.", intro: "Get in touch with the provider to discuss your requirements.", steps: [["Explore their work", "Browse the photos and service details."], ["Get in touch", "Ask the provider about your requirements."], ["Plan the next step", "Agree on the details directly with your provider."]] };
  }
}
export function serviceLocationLabel(location?: string | null) {
  return ({ AT_VENDOR: "At the provider’s location", AT_CUSTOMER: "At your location", VIRTUAL: "Online", FLEXIBLE: "Flexible · agree with your provider" } as Record<string, string>)[location ?? ""] ?? null;
}
export function serviceMinutes(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return null;
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}` : `${minutes} min`;
}
export function serviceSpecifications(service: ServiceDisplayData): [string, string][] {
  const rows: [string, string][] = [];
  const booked = service.serviceType === "BOOKABLE" || service.serviceType === "VIRTUAL";
  const duration = serviceMinutes(booked ? service.durationMinutes || service.serviceDuration || 60 : service.serviceDuration);
  if (duration) rows.push(["Session duration", duration]);
  const location = service.serviceType === "VIRTUAL" ? "Online" : serviceLocationLabel(service.serviceLocation);
  if (location) rows.push(["Service location", location]);
  if (booked) {
    rows.push(["Time zone", "Trinidad & Tobago (AST)"]);
    if (service.advanceBookingDays != null) rows.push(["Book ahead", `Up to ${service.advanceBookingDays} days`]);
    rows.push(["Confirmation", service.requiresApproval ? "Provider approval required" : "No provider approval required"]);
    if (service.requiresDeposit && service.depositAmount != null) rows.push(["Booking deposit", formatTTDPrice(service.depositAmount)]);
    if (service.bookingPaymentMode) rows.push(["Payment options", ({ ONLINE_ONLY: "Online payment", ON_ARRIVAL_ONLY: "Pay on arrival", CUSTOMER_CHOOSES: "Online or on arrival" } as Record<string, string>)[service.bookingPaymentMode] ?? service.bookingPaymentMode]);
    if (service.cancellationHours != null) rows.push(["Cancellation notice", service.cancellationHours === 0 ? "No advance notice specified" : `${service.cancellationHours} hours`]);
  }
  if (service.serviceType === "QUOTE") {
    if (service.responseTime) rows.push(["Typical response", service.responseTime]);
    if (service.minimumQuoteAmount != null) rows.push(["Minimum job value", formatTTDPrice(service.minimumQuoteAmount)]);
    rows.push(["Site visit", service.siteVisitRequired ? "Required before the final quote" : "Not required to request a quote"]);
  }
  if (service.serviceType === "SUBSCRIPTION") {
    rows.push(["Billing", formatSubscriptionIntervalDisplay(service.subscriptionInterval)]);
    if (service.sessionsIncluded != null) rows.push(["Sessions included", `${service.sessionsIncluded} per billing cycle`]);
    if (service.subscriptionCancellationDays != null) rows.push(["Cancellation notice", service.subscriptionCancellationDays === 0 ? "Cancel anytime" : `${service.subscriptionCancellationDays} days`]);
    rows.push(["Pause subscription", service.subscriptionCanPause ? (service.subscriptionPauseMaxWeeks ? `Up to ${service.subscriptionPauseMaxWeeks} weeks` : "Available") : "Not offered"]);
    if (service.subscriptionTrialPeriod) rows.push(["Trial", `${service.subscriptionTrialPeriod} days · ${formatTTDPrice(service.subscriptionTrialPrice ?? 0)}`]);
  }
  if (service.serviceType === "ON_DEMAND") {
    const response = serviceMinutes(service.estimatedResponseMins);
    if (response) rows.push(["Estimated response", response]);
    if (service.travelFee != null) rows.push(["Travel fee", formatTTDPrice(service.travelFee)]);
    if (service.serviceRadius != null) rows.push(["Service radius", `${service.serviceRadius} km`]);
  }
  if (service.serviceType === "VIRTUAL") {
    if (service.virtualPlatform) rows.push(["Platform", ({ zoom: "Zoom", google_meet: "Google Meet", teams: "Microsoft Teams", whatsapp: "WhatsApp Video", facetime: "FaceTime", other: "Other platform" } as Record<string, string>)[service.virtualPlatform] ?? service.virtualPlatform]);
    if (service.maxGroupSize != null) rows.push(["Group size", service.maxGroupSize === 1 ? "One-to-one session" : `Up to ${service.maxGroupSize} participants`]);
  }
  return rows;
}
