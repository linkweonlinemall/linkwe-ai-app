import type { RecordKind } from "./record-fields";
export type RecordField = {
  name: string;
  type: string;
  required: boolean;
  list: boolean;
  options?: string[];
  value: unknown;
  readonly?: boolean;
};
export type RecordSection = {
  id: string;
  title: string;
  description: string;
  fields: string[];
  serviceTypes?: string[];
};
const section = (
  id: string,
  title: string,
  description: string,
  fields: string,
  serviceTypes?: string[],
): RecordSection => ({
  id,
  title,
  description,
  fields: fields.split(" "),
  serviceTypes,
});
export const RECORD_SECTIONS: Record<RecordKind, RecordSection[]> = {
  store: [
    section(
      "identity",
      "Store identity",
      "Give this business a clear, recognisable presence.",
      "ownerId name slug categoryId tagline description",
    ),
    section(
      "media",
      "Brand & gallery",
      "The logo, cover and photographs customers see on the storefront.",
      "logoUrl coverPhotoUrl storeGallery",
    ),
    section(
      "location",
      "Location & contact",
      "Help customers find the business and connect with its team.",
      "region address latitude longitude socialLinks",
    ),
    section(
      "hours",
      "Opening hours",
      "Set each day's hours, including breaks or all-day opening.",
      "openingHours isAvailableNow staffMode",
    ),
    section(
      "experience",
      "Customer experience",
      "Set expectations before a customer places an order.",
      "tags amenities policies checkoutFields shippingMode",
    ),
    section(
      "visibility",
      "Publication",
      "Review the storefront before making it available to customers.",
      "status onboardingStep",
    ),
  ],
  product: [
    section(
      "details",
      "Product details",
      "A clear name, category and description make discovery easier.",
      "storeId name slug category brand shortDescription description tags",
    ),
    section(
      "media",
      "Product images",
      "The first image is the cover. Use the arrows to change the order.",
      "images",
    ),
    section(
      "pricing",
      "Price & inventory",
      "Prices are in TTD. Leave stock empty when it is not tracked.",
      "price compareAtPrice sku stock condition hasVariants variants",
    ),
    section(
      "delivery",
      "Delivery & collection",
      "Choose how this item gets to your customer.",
      "allowDelivery allowPickup deliveryFee deliveryRegions weight weightUnit length width height returnPolicy",
    ),
    section(
      "digital",
      "Digital delivery",
      "Downloads, previews and licence conditions for digital products.",
      "isDigital digitalFileUrl fileType fileSizeKb downloadLimit downloadExpiryDays previewUrl licenceType",
    ),
    section(
      "checkout",
      "Customer questions",
      "Collect the information needed to fulfil this product.",
      "checkoutFields",
    ),
    section(
      "visibility",
      "Publication & search",
      "Control visibility and how the item appears in search results.",
      "isPublished isArchived isFeatured isAvailable isBookable metaTitle metaDescription",
    ),
  ],
  service: [
    section(
      "details",
      "Service details",
      "Choose the service model first. Relevant settings appear below.",
      "storeId name slug serviceType category shortDescription description tags",
    ),
    section(
      "media",
      "Service images",
      "Show the quality of this provider's work. First image is the cover.",
      "images",
    ),
    section(
      "pricing",
      "Pricing & payment",
      "Prices are in TTD. Make the payment expectations clear.",
      "price compareAtPrice requiresDeposit depositAmount bookingPaymentMode returnPolicy",
    ),
    section(
      "booking",
      "Appointments & availability",
      "Session length, booking limits and the weekly schedule.",
      "bookingType durationMinutes serviceDuration sessionDuration bufferMinutes maxPerDay maxGroupSize advanceBookingDays cancellationHours requiresApproval useStoreHours availableDays availableFrom availableTo",
      ["BOOKABLE", "VIRTUAL"],
    ),
    section(
      "quotes",
      "Quote requests",
      "Set expectations for estimates and site visits.",
      "quotePriceType responseTime minimumQuoteAmount siteVisitRequired",
      ["QUOTE"],
    ),
    section(
      "subscription",
      "Recurring services",
      "Billing cycles, included sessions and cancellation rules.",
      "subscriptionInterval sessionsIncluded subscriptionCancellationDays subscriptionTrialPeriod subscriptionTrialPrice subscriptionCanPause subscriptionPauseMaxWeeks",
      ["SUBSCRIPTION"],
    ),
    section(
      "on-demand",
      "On-demand requests",
      "Where the provider travels and how quickly they respond.",
      "travelFee serviceRadius estimatedResponseMins",
      ["ON_DEMAND"],
    ),
    section(
      "location",
      "Where it happens",
      "Physical address, travel options or virtual meeting details.",
      "serviceLocation address latitude longitude virtualPlatform virtualMeetingInfo",
    ),
    section(
      "checkout",
      "Customer questions",
      "Collect the details needed to deliver the service.",
      "checkoutFields",
    ),
    section(
      "visibility",
      "Publication & search",
      "Availability, featured placement and search information.",
      "isPublished isArchived isAvailable isFeatured metaTitle metaDescription",
    ),
  ],
  user: [
    section(
      "profile",
      "Personal information",
      "The details used to contact and identify this person.",
      "fullName email phone region",
    ),
    section(
      "access",
      "Account access",
      "Choose a role and manage sign-in access. Admins have full platform access.",
      "role password isActive suspended",
    ),
    section(
      "bank",
      "Payout details",
      "Vendor bank details used by the finance team. Changes do not initiate a payout.",
      "bankDetails",
    ),
  ],
  listing: [
    section(
      "details",
      "Listing details",
      "Use Products or Services for the main storefront catalogue.",
      "storeId title slug type shortDescription description",
    ),
    section(
      "media",
      "Cover image",
      "Choose an image that clearly represents this listing.",
      "imageUrl",
    ),
    section(
      "pricing",
      "Price",
      "Enter the customer-facing amount, in the selected currency.",
      "priceMinor currency",
    ),
    section(
      "specifics",
      "Listing specifications",
      "Fields specific to the selected listing type.",
      "listingDetails",
    ),
    section(
      "visibility",
      "Publication",
      "Choose when customers can see the listing.",
      "status publishedAt",
    ),
  ],
};
export const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  ownerId: "Store owner",
  storeId: "Store",
  slug: "URL name",
  categoryId: "Store category",
  logoUrl: "Store logo",
  coverPhotoUrl: "Cover photograph",
  storeGallery: "Store gallery",
  images: "Photos",
  imageUrl: "Cover image",
  price: "Price (TTD)",
  priceMinor: "Price",
  compareAtPrice: "Original price (TTD)",
  stock: "Available stock",
  sku: "SKU / reference",
  hasVariants: "Offer product variations",
  variants: "Product variations",
  isPublished: "Published",
  isArchived: "Archived",
  isAvailable: "Available to customers",
  isFeatured: "Featured on LinkWe",
  isBookable: "Bookable product",
  allowPickup: "Customer collection",
  allowDelivery: "Delivery available",
  deliveryFee: "Delivery fee (TTD)",
  weight: "Weight",
  length: "Length (cm)",
  width: "Width (cm)",
  height: "Height (cm)",
  fileSizeKb: "File size (KB)",
  downloadExpiryDays: "Download expires after (days)",
  downloadLimit: "Maximum downloads",
  isDigital: "Digital product",
  digitalFileUrl: "Download file URL",
  previewUrl: "Preview URL",
  metaTitle: "Search result title",
  metaDescription: "Search result description",
  checkoutFields: "Questions at checkout",
  staffMode: "Staff setup",
  shippingMode: "Delivery provider",
  isAvailableNow: "Available now",
  onboardingStep: "Setup progress",
  serviceType: "How customers request this service",
  serviceLocation: "Service location",
  serviceDuration: "Display duration (minutes)",
  durationMinutes: "Booking slot length (minutes)",
  sessionDuration: "Session length (minutes)",
  bufferMinutes: "Time between bookings (minutes)",
  maxPerDay: "Maximum bookings per day",
  useStoreHours: "Use store opening hours",
  availableDays: "Available days",
  availableFrom: "Available from",
  availableTo: "Available until",
  requiresDeposit: "Deposit required",
  depositAmount: "Deposit amount (TTD)",
  advanceBookingDays: "Book up to (days ahead)",
  cancellationHours: "Cancellation notice (hours)",
  maxGroupSize: "Maximum people per booking",
  requiresApproval: "Provider approval required",
  bookingPaymentMode: "Accepted payment methods",
  quotePriceType: "Quote pricing model",
  minimumQuoteAmount: "Minimum job value (TTD)",
  siteVisitRequired: "Site visit required",
  subscriptionInterval: "Billing interval",
  sessionsIncluded: "Sessions per billing cycle",
  subscriptionCancellationDays: "Cancellation notice (days)",
  subscriptionTrialPeriod: "Trial length (days)",
  subscriptionTrialPrice: "Trial price (TTD)",
  subscriptionCanPause: "Allow customers to pause",
  subscriptionPauseMaxWeeks: "Maximum pause (weeks)",
  travelFee: "Travel fee (TTD)",
  serviceRadius: "Service radius (km)",
  estimatedResponseMins: "Estimated response (minutes)",
  virtualMeetingInfo: "Joining instructions",
  password: "Temporary password",
  isActive: "Account enabled",
  suspended: "Account suspended",
  bankDetails: "Vendor bank account",
  socialLinks: "Contact & social links",
  listingDetails: "Specifications",
  region: "Town / region",
};
export const FIELD_HELP: Record<string, string> = {
  bookingPaymentMode:
    "Pay on arrival requires an active Growth or Pro store. Virtual services and other plans use online payment automatically.",
  slug: "Lowercase letters, numbers and hyphens. Changing an existing URL can break shared links.",
  compareAtPrice:
    "Optional. A higher original price shows a saving to customers.",
  stock: "Blank means untracked; zero means sold out.",
  hasVariants:
    "Add sizes, colours or other options below. Each variation can have its own price and stock.",
  password:
    "Use 12 or more characters, up to 72 bytes. Share credentials securely; no email is sent from this form.",
  priceMinor:
    "Displayed in currency units. The system handles conversion to minor units.",
  isArchived:
    "Archived items are hidden. Existing customer history is retained.",
  isActive: "Disabled accounts cannot sign in.",
  suspended:
    "Temporarily blocks sign-in without deleting the person or their history.",
  bankDetails:
    "For vendors only. Saved to the vendor payout profile, not the retired legacy bank fields.",
  virtualMeetingInfo:
    "Check whether these instructions contain private meeting credentials before publishing.",
  metaDescription:
    "A concise summary for search results. Aim for around 160 characters.",
  openingHours:
    "Days without an entry are not set. Closed and open 24 hours are explicit choices.",
  checkoutFields:
    "Add text, choice or file-upload questions. Existing question IDs are preserved when edited.",
};
export const ENUM_LABELS: Record<string, string> = {
  BOOKABLE: "Appointments",
  QUOTE: "Request a quote",
  SUBSCRIPTION: "Recurring subscription",
  ON_DEMAND: "On demand",
  VIRTUAL: "Virtual appointment",
  AT_VENDOR: "At the business",
  AT_CUSTOMER: "At the customer's location",
  FLEXIBLE: "Flexible location",
  CUSTOMER_CHOOSES: "Online or on arrival",
  ONLINE_ONLY: "Online payment only",
  ON_ARRIVAL_ONLY: "Pay on arrival only",
  STARTING_FROM: "Starting from price",
  CALLOUT_FEE: "Call-out fee",
  FREE_QUOTE: "Free quote",
  SELF: "Store arranges delivery",
  LINKWE: "LinkWe delivery",
  SOLO: "Solo operator",
  TEAM: "Staff team",
  ADMIN: "Administrator",
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
  COURIER: "Legacy courier",
};
export function humanLabel(value: string) {
  return (
    FIELD_LABELS[value] ||
    value
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/^./, (c) => c.toUpperCase())
  );
}
export function optionLabel(value: string) {
  return (
    ENUM_LABELS[value] ||
    value
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (c) => c.toUpperCase())
  );
}
export function recordListHref(kind: RecordKind) {
  return `/dashboard/admin/${kind === "user" ? "users" : kind === "store" ? "stores" : kind === "product" ? "products" : kind === "service" ? "services" : "listings"}`;
}
