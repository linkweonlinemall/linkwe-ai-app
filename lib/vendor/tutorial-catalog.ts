export type TutorialCategory = "Get started" | "Create & sell" | "Customers & fulfilment" | "Business operations";

export type TutorialStep = {
  title: string;
  body: string;
  route?: string;
  selector?: string;
  activateSelector?: string;
  navigateSelector?: string;
  mobileMore?: boolean;
  field?: boolean;
  note?: string;
};

export type TutorialDefinition = {
  label: string;
  description: string;
  category: TutorialCategory;
  duration: string;
  steps: TutorialStep[];
};

const routeStep = (route: string, title: string, body: string): TutorialStep => ({ route, title, body });
const field = (route: string, name: string, title: string, body: string, note?: string): TutorialStep => ({ route, title, body, selector: `[name="${name}"]`, field: true, note });

const PRODUCT_ROUTE = "/dashboard/vendor/products/new";
const SERVICE_ROUTE = "/dashboard/vendor/services/new";
const EVENT_ROUTE = "/dashboard/vendor/events/new";

const productBasics: TutorialStep[] = [
  field(PRODUCT_ROUTE, "name", "Product name", "Use the exact customer-facing name. Include the important product or model words shoppers will search for; avoid internal abbreviations."),
  field(PRODUCT_ROUTE, "slug", "Public product link", "This becomes the product’s web address. Keep it short, readable and unique. LinkWe can generate it from the name."),
  field(PRODUCT_ROUTE, "description", "Full description", "Explain what the customer receives, materials or specifications, who it suits, care instructions and anything that affects the buying decision."),
  field(PRODUCT_ROUTE, "shortDescription", "Short description", "Write the quick summary shown in compact product views. Lead with the strongest benefit, not a repeat of the full description."),
  field(PRODUCT_ROUTE, "category", "Category", "Choose the closest category so filters and marketplace discovery place the product correctly."),
  field(PRODUCT_ROUTE, "brand", "Brand", "Enter the manufacturer or your own brand when relevant. Leave it blank only when the product genuinely has no brand."),
  field(PRODUCT_ROUTE, "tags", "Search tags", "Add useful comma-separated words customers may use, such as style, colour, audience, material or occasion. Do not add unrelated popular terms."),
  field(PRODUCT_ROUTE, "condition", "Condition", "Choose New, Used or Refurbished accurately. Describe wear or restoration clearly in the description and photos."),
  field(PRODUCT_ROUTE, "isFeatured", "Featured product", "Use this to emphasise a priority item in your own store experience. It does not guarantee marketplace ranking."),
  field(PRODUCT_ROUTE, "price", "Selling price", "Enter the current customer price in TTD. For variable products, this is the base price and variants can override it."),
  field(PRODUCT_ROUTE, "compareAtPrice", "Original or compare-at price", "Use only for a genuine former price. It can show the saving; do not create a false discount."),
  field(PRODUCT_ROUTE, "sku", "SKU", "Add your internal stock code to identify the product. A consistent SKU system makes inventory and fulfilment easier."),
  { route: PRODUCT_ROUTE, selector: '[data-tour="product-images"]', title: "Product images", body: "Upload bright, sharp images from useful angles. The first image becomes the main thumbnail. Show details, scale and any condition issues." },
];

const productFulfilment: TutorialStep[] = [
  field(PRODUCT_ROUTE, "allowDelivery", "Allow delivery", "Enable this when the item can be sent to the customer. Delivery pricing follows the shipping methods and zones configured in your dashboard."),
  field(PRODUCT_ROUTE, "weight", "Weight", "Enter the packaged shipping weight—not only the bare item—so LinkWe delivery can calculate correctly."),
  field(PRODUCT_ROUTE, "weightUnit", "Weight unit", "Choose the unit that matches the number entered. A wrong unit can produce a seriously incorrect delivery charge."),
  field(PRODUCT_ROUTE, "length", "Package length", "Enter the packaged length in centimetres. Measure the parcel ready for delivery."),
  field(PRODUCT_ROUTE, "width", "Package width", "Enter the packaged width in centimetres."),
  field(PRODUCT_ROUTE, "height", "Package height", "Enter the packaged height in centimetres."),
  field(PRODUCT_ROUTE, "allowPickup", "Allow local pickup", "Enable pickup only if the customer has a reliable collection location and instructions. Pickup orders should use the pickup—not shipping—status flow."),
  field(PRODUCT_ROUTE, "returnPolicy", "Product return policy", "State the return window, eligible condition, exclusions and who pays return delivery. Keep it consistent with the store policy."),
  field(PRODUCT_ROUTE, "metaTitle", "Search title", "Optional SEO title for search engines. Keep it descriptive and natural rather than stuffing keywords."),
  field(PRODUCT_ROUTE, "metaDescription", "Search description", "Optional short search-engine summary that encourages the right customer to open the listing."),
  { route: PRODUCT_ROUTE, selector: '[data-tour="product-actions"]', title: "Draft or publish", body: "Save a draft while information is incomplete. Publish only after checking price, stock, images, variations, delivery and the public preview." },
];

const serviceBasics: TutorialStep[] = [
  field(SERVICE_ROUTE, "name", "Service name", "Use a clear service customers recognise, such as “30-minute consultation” or “Bridal makeup package”."),
  field(SERVICE_ROUTE, "description", "Service description", "Explain deliverables, process, customer requirements, what is excluded, timing and the result the customer should expect."),
  field(SERVICE_ROUTE, "category", "Service category", "Choose the closest category so the service appears in the right filters and searches."),
  field(SERVICE_ROUTE, "tags", "Service tags", "Add relevant comma-separated skills, styles, audience, location or occasion terms. Keep them specific and truthful."),
];

const serviceMediaAndPublish: TutorialStep[] = [
  { route: SERVICE_ROUTE, selector: '[data-tour="service-media"]', title: "Service images", body: "Upload strong examples of the work, space, team or expected result. Avoid unrelated stock images that could mislead customers." },
  { route: SERVICE_ROUTE, selector: '[data-tour="service-publish"]', title: "Draft or publish", body: "Keep the service as a draft until price, availability, policies and images are correct. Publishing makes it available to customers once the store is live." },
];

export const tutorialCatalog = {
  essentials: {
    label: "Start here: Vendor dashboard",
    description: "Understand the complete control centre and the correct order to set up your business.",
    category: "Get started", duration: "5 min",
    steps: [
      routeStep("/dashboard/vendor", "Welcome to your business control centre", "The dashboard shows what needs attention, how the store is performing and the fastest routes to daily work."),
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-availability"]', title: "On-demand availability", body: "Turn this on only when you are genuinely ready to accept immediate on-demand requests. Turn it off when response capacity is unavailable." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-readiness"]', title: "Open for business checklist", body: "Complete email verification, ID and selfie review, phone, logo, description, bank details and a first listing. Your store cannot operate properly until the required checks are complete." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-metrics"]', title: "Performance cards", body: "Use these for settled earnings, orders, views and conversion. Settled earnings are net eligible funds—not every order placed." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-sales-chart"]', title: "Sales trend", body: "Watch the recent sales pattern, not one isolated day. Open the report when you need the transaction detail behind a change." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-recent-orders"]', title: "Recent orders", body: "Open pending work promptly. Confirm payment and fulfilment method before taking action." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-profile-strength"]', title: "Profile strength", body: "Complete logo, description, cover, gallery, location and opening hours. A complete store gives customers more confidence." },
      { route: "/dashboard/vendor", selector: '[data-tour="vendor-shortcuts"]', title: "Daily shortcuts", body: "Use these to create a product, edit the store, open orders or review Finance without searching the menu." },
      { route: "/dashboard/vendor", selector: '[data-tour="public-store"]', title: "Preview the public store", body: "Check the actual customer experience on mobile and desktop after meaningful changes and before sharing your link." },
    ],
  },
  products: {
    label: "Manage products", description: "Operate the catalogue, inventory, publishing and bulk actions.", category: "Create & sell", duration: "4 min",
    steps: [
      routeStep("/dashboard/vendor/products", "Product catalogue", "This page is the operating list for physical and digital products."),
      { route: "/dashboard/vendor/products", selector: '[href="/dashboard/vendor/products/new"]', title: "Add a product", body: "Create a new listing here. Choose the correct product type before entering information because fields change by type." },
      { route: "/dashboard/vendor/products", selector: '[data-tour="products-list"]', title: "Read each product row", body: "Check image, name, type, price, stock and publication status. Open Edit when the public information or inventory changes." },
      { route: "/dashboard/vendor/products", selector: '[data-tour="products-select"]', title: "Select products", body: "Select one or more rows to reveal bulk tools. Confirm the selection before applying a change." },
      { route: "/dashboard/vendor/products", selector: '[data-tour="products-bulk"]', title: "Bulk actions", body: "Publish, unpublish, add stock, feature, change category or delete selected items. Deletion is permanent, so use it carefully." },
    ],
  },
  productSimple: {
    label: "Create a simple product", description: "Every field for one-price, one-stock products.", category: "Create & sell", duration: "8 min",
    steps: [
      { route: PRODUCT_ROUTE, activateSelector: '[data-product-type="simple"]', selector: '[data-product-type="simple"]', title: "Choose Simple product", body: "Use Simple when every unit has the same options, price and stock level. Examples: one candle size, one book edition or one appliance model." },
      ...productBasics,
      field(PRODUCT_ROUTE, "stock", "Stock quantity", "Enter the number currently available to sell. Update it promptly after offline sales or restocking to prevent overselling."),
      ...productFulfilment,
    ],
  },
  productVariable: {
    label: "Create a variable product", description: "Build colours, sizes and variant-level inventory correctly.", category: "Create & sell", duration: "10 min",
    steps: [
      { route: PRODUCT_ROUTE, activateSelector: '[data-product-type="variable"]', selector: '[data-product-type="variable"]', title: "Choose Variable product", body: "Use Variable when customers must choose colour, size or another option and combinations can have different prices, stock, SKUs or images." },
      ...productBasics,
      { route: PRODUCT_ROUTE, selector: '[data-tour="product-variants"]', title: "Variation attributes", body: "Add meaningful attributes such as Colour and Size, then add the exact values you sell. Colour values should use the correct swatches." },
      { route: PRODUCT_ROUTE, selector: '[data-tour="product-variants"]', title: "Variant combinations", body: "Review every generated combination. Set its price, stock, SKU and image where they differ. Customers and cart quantities treat each combination separately." },
      ...productFulfilment,
    ],
  },
  productDigital: {
    label: "Create a digital product", description: "Set up files, licences and download controls.", category: "Create & sell", duration: "8 min",
    steps: [
      { route: PRODUCT_ROUTE, activateSelector: '[data-product-type="digital"]', selector: '[data-product-type="digital"]', title: "Choose Digital product", body: "Use Digital for downloadable music, ebooks, software, templates or files delivered after successful payment. Digital items do not use shipping tracking." },
      ...productBasics,
      { route: PRODUCT_ROUTE, selector: '[data-tour="digital-file"]', title: "Upload the deliverable", body: "Upload the final customer file—not a preview. Test that it opens correctly and contains no private working files." },
      field(PRODUCT_ROUTE, "previewUrl", "Preview URL", "Optional link for a demo, sample or trailer that helps customers evaluate the digital product before buying."),
      field(PRODUCT_ROUTE, "downloadLimit", "Download limit", "Set how many times the customer can download after purchase. Leave sufficient allowance for legitimate device changes."),
      field(PRODUCT_ROUTE, "downloadExpiryDays", "Download expiry", "Set the number of days the link remains available. Explain any expiry clearly in the description."),
      field(PRODUCT_ROUTE, "licenceType", "Licence type", "Choose the usage rights the purchase grants, such as personal or commercial. Put the full licence terms in the product details or file."),
      { route: PRODUCT_ROUTE, selector: '[data-tour="product-images"]', title: "Digital cover images", body: "Use professional cover artwork and previews. Never upload the paid deliverable as a public product image." },
      field(PRODUCT_ROUTE, "metaTitle", "Search title", "Optional title for search engines."),
      field(PRODUCT_ROUTE, "metaDescription", "Search description", "Optional short summary for search engines."),
      { route: PRODUCT_ROUTE, selector: '[data-tour="product-actions"]', title: "Test before publishing", body: "Save, complete a test purchase and verify the download link before selling. Publish only when delivery works correctly." },
    ],
  },
  services: {
    label: "Manage services", description: "Understand service types, status, availability and service actions.", category: "Create & sell", duration: "4 min",
    steps: [
      routeStep("/dashboard/vendor/services", "Service catalogue", "All bookable, quoted, subscription, on-demand and virtual services are managed here."),
      { route: "/dashboard/vendor/services", selector: '[href="/dashboard/vendor/services/new"]', title: "Create a service", body: "Start here and choose the buying workflow that matches how the work is actually sold." },
      { route: "/dashboard/vendor/services", selector: '[data-tour="services-list"]', title: "Service cards", body: "Each card shows the service type, price/status and actions. Edit details, manage availability when relevant, or open the public page." },
      { route: "/dashboard/vendor/services", selector: '[data-tour="services-select"]', title: "Bulk service controls", body: "Select services to publish, unpublish or delete several at once. Unpublish instead of deleting when the service may return." },
    ],
  },
  serviceBooking: {
    label: "Create a booking service", description: "Appointments, payments, deposits and availability.", category: "Create & sell", duration: "9 min",
    steps: [
      { route: SERVICE_ROUTE, activateSelector: '[data-service-type="BOOKABLE"]', selector: '[data-service-type="BOOKABLE"]', title: "Choose Booking", body: "Use Booking when customers reserve a date and time, such as appointments, lessons, rentals or consultations." },
      ...serviceBasics,
      field(SERVICE_ROUTE, "price", "Booking price", "Enter the full service price in TTD."),
      { route: SERVICE_ROUTE, selector: '[data-tour="booking-payment"]', title: "Payment method", body: "Choose full online payment, deposit or eligible pay on arrival. Starter vendors must use online service payment. Online payment creates a confirmed LinkWe transaction." },
      field(SERVICE_ROUTE, "depositAmount", "Deposit amount", "When deposits are enabled, enter the amount required to secure the booking. State when the balance is due and the cancellation treatment."),
      field(SERVICE_ROUTE, "serviceDuration", "Service duration", "Enter the real appointment length so availability prevents overlapping bookings. Include necessary cleanup or transition time where appropriate."),
      { route: SERVICE_ROUTE, selector: '[data-tour="service-availability"]', title: "Availability", body: "After creating the service, open Manage availability to set working days, time slots, notice, breaks, staff and blocked periods." },
      ...serviceMediaAndPublish,
    ],
  },
  serviceQuote: {
    label: "Create a quote service", description: "Custom estimates, call-out fees and response rules.", category: "Create & sell", duration: "8 min",
    steps: [
      { route: SERVICE_ROUTE, activateSelector: '[data-service-type="QUOTE"]', selector: '[data-service-type="QUOTE"]', title: "Choose Quote", body: "Use Quote when the final price depends on scope, inspection, quantity or customer requirements." },
      ...serviceBasics,
      { route: SERVICE_ROUTE, selector: '[data-tour="quote-price-type"]', title: "Quote pricing method", body: "Choose Starting from for a visible minimum, Call-out fee for a paid assessment, or Free quote when no upfront price is charged." },
      field(SERVICE_ROUTE, "price", "Displayed or call-out price", "Enter the starting amount or call-out fee selected above. This is not automatically the final custom quote."),
      field(SERVICE_ROUTE, "responseTime", "Response time", "Set a realistic promise for replying to requests. Customers use it to judge when they should expect an estimate."),
      field(SERVICE_ROUTE, "minimumQuoteAmount", "Minimum quote amount", "Optional minimum job value. Use it to discourage requests below the smallest job you can profitably accept."),
      ...serviceMediaAndPublish,
    ],
  },
  serviceSubscription: {
    label: "Create a subscription service", description: "Recurring plans, sessions, trials, pauses and cancellation.", category: "Create & sell", duration: "10 min",
    steps: [
      { route: SERVICE_ROUTE, activateSelector: '[data-service-type="SUBSCRIPTION"]', selector: '[data-service-type="SUBSCRIPTION"]', title: "Choose Subscription", body: "Use Subscription when a customer pays repeatedly for ongoing access, sessions or deliverables." },
      ...serviceBasics,
      field(SERVICE_ROUTE, "price", "Recurring price", "Enter the amount charged for each billing interval, not an annual total unless the interval is annual."),
      field(SERVICE_ROUTE, "subscriptionInterval", "Billing interval", "Choose how often payment is due. Match the interval to how often benefits or sessions are delivered."),
      field(SERVICE_ROUTE, "sessionsIncluded", "Sessions included", "Enter how many sessions or units the customer receives per billing period. Explain rollover rules in the description."),
      field(SERVICE_ROUTE, "subscriptionCancellationDays", "Cancellation notice", "Set how much notice customers must give. Keep the rule reasonable and state when access ends."),
      field(SERVICE_ROUTE, "subscriptionTrialPeriod", "Trial period", "Optional number of trial days. Use a trial only when you can deliver a meaningful evaluation experience."),
      field(SERVICE_ROUTE, "subscriptionTrialPrice", "Trial price", "Optional price for the trial period. Make the transition to the regular recurring price clear."),
      { route: SERVICE_ROUTE, selector: '[data-tour="subscription-pause"]', title: "Pause rules", body: "Decide whether customers may pause and for how long. Pauses should not create service access that was not paid for." },
      field(SERVICE_ROUTE, "subscriptionPauseMaxWeeks", "Maximum pause", "Set the longest allowed pause in weeks when pausing is enabled."),
      ...serviceMediaAndPublish,
    ],
  },
  serviceOnDemand: {
    label: "Create an on-demand service", description: "Immediate requests, response time, radius and travel fees.", category: "Create & sell", duration: "8 min",
    steps: [
      { route: SERVICE_ROUTE, activateSelector: '[data-service-type="ON_DEMAND"]', selector: '[data-service-type="ON_DEMAND"]', title: "Choose On-demand", body: "Use On-demand for work customers request as soon as possible. Only advertise it when you can monitor and respond quickly." },
      ...serviceBasics,
      field(SERVICE_ROUTE, "price", "Base service price", "Enter the service charge before any clearly disclosed travel fee."),
      field(SERVICE_ROUTE, "estimatedResponseMins", "Estimated response", "Choose a response window you can consistently meet. Turn off dashboard on-demand availability when you cannot accept requests."),
      field(SERVICE_ROUTE, "travelFee", "Travel fee", "Enter a transparent TTD travel charge when the provider goes to the customer."),
      field(SERVICE_ROUTE, "serviceRadius", "Service radius", "Enter the maximum distance you can serve reliably. Do not accept requests outside the safe operating area."),
      ...serviceMediaAndPublish,
    ],
  },
  serviceVirtual: {
    label: "Create a virtual service", description: "Online delivery, platforms and group capacity.", category: "Create & sell", duration: "8 min",
    steps: [
      { route: SERVICE_ROUTE, activateSelector: '[data-service-type="VIRTUAL"]', selector: '[data-service-type="VIRTUAL"]', title: "Choose Virtual", body: "Use Virtual when the service is delivered online by video, audio, chat or another remote platform." },
      ...serviceBasics,
      field(SERVICE_ROUTE, "price", "Virtual service price", "Enter the price for the defined virtual session or deliverable."),
      field(SERVICE_ROUTE, "serviceDuration", "Session duration", "Enter the actual online session length and leave transition time between bookings."),
      field(SERVICE_ROUTE, "virtualPlatform", "Platform", "Choose the platform used to deliver the service. Make sure both vendor and customer can access it."),
      field(SERVICE_ROUTE, "virtualMeetingInfo", "Meeting instructions", "Explain how the customer receives the link or joins. Do not publish reusable private meeting credentials."),
      field(SERVICE_ROUTE, "maxGroupSize", "Maximum group size", "Set the number of customers who can attend one session without reducing the promised quality."),
      ...serviceMediaAndPublish,
    ],
  },
  orders: {
    label: "Orders & fulfilment", description: "Process product and service sales using the correct status flow.", category: "Customers & fulfilment", duration: "6 min",
    steps: [
      routeStep("/dashboard/vendor/orders", "Orders workspace", "Product fulfilment and service work appear in one operational area."),
      { route: "/dashboard/vendor/orders", selector: 'nav[aria-label="Order type"]', title: "Product vs service orders", body: "Use the two tabs to separate shipped/pickup/digital product work from bookings, quotes, requests and subscriptions." },
      { route: "/dashboard/vendor/orders", selector: '[data-tour="orders-action"]', title: "Action required", body: "Start here. Confirm payment and fulfilment method, then open the order. Never fulfil a pending-payment order as if it were paid." },
      { route: "/dashboard/vendor/orders", selector: '[data-tour="orders-list"]', title: "Order cards", body: "Read order number, date, customer, delivery method, total and current status. Use View order for the full record." },
      { route: "/dashboard/vendor/orders", selector: 'a[href^="/dashboard/vendor/orders/"]', navigateSelector: 'a[href^="/dashboard/vendor/orders/"]', title: "Open an order", body: "We’ll open the first available order so you can learn the full fulfilment workspace. This only views the order; it does not change its status." },
      { selector: '[data-tour="order-progress"]', title: "Follow the correct progress", body: "This progress changes for vendor delivery, LinkWe delivery and local pickup. Advance the real order only after completing the highlighted physical step." },
      { selector: '[data-tour="order-items"]', title: "Verify items and variations", body: "Confirm every item, variation, quantity and image before packing. Similar-looking variants must remain separate." },
      { selector: '[data-tour="order-fulfilment-action"]', title: "Take the next fulfilment action", body: "The action shown is based on payment, current status and delivery method. Never use it early just to clear the order." },
      { selector: '[data-tour="order-delivery-location"]', title: "Customer delivery location", body: "For delivery orders, confirm the written address, phone and map pin before leaving. Pickup orders intentionally do not show a customer delivery map." },
      { selector: '[data-tour="order-receipt-qr"]', title: "Secure receipt confirmation", body: "At delivery or collection, let the customer scan this QR. They must sign into their own account and confirm receipt before vendor earnings are released." },
      { route: "/dashboard/vendor/orders?view=services", selector: '[data-tour="service-order-links"]', title: "Service work shortcuts", body: "Bookings, requests and subscribers each have specialised controls. Use the shortcut that matches the service order type." },
      { title: "Shipping fulfilment", body: "Prepare the correct items, add tracking or handoff details when applicable, and advance statuses only after the real-world action occurs." },
      { title: "Local pickup fulfilment", body: "Mark the order ready for pickup and confirm collection. Do not use shipping or out-for-delivery statuses for pickup." },
      { title: "Digital fulfilment", body: "A paid digital item is delivered immediately through its download flow and should not display physical delivery tracking." },
      { title: "Service completion", body: "Use the service-specific detail page, document communication and mark complete only when the agreed work has been delivered." },
    ],
  },
  bookings: {
    label: "Bookings", description: "Operate appointments, deposits, notes, meetings and completion.", category: "Customers & fulfilment", duration: "6 min",
    steps: [
      routeStep("/dashboard/vendor/bookings", "Booking manager", "This page contains scheduled customer appointments across all bookable services."),
      { route: "/dashboard/vendor/bookings", selector: '[data-tour="booking-stats"]', title: "Booking summary", body: "Use the counts to see upcoming work and bookings requiring attention. Counts are operational, not settled earnings." },
      { route: "/dashboard/vendor/bookings", selector: '[data-tour="booking-filters"]', title: "Filters", body: "Filter by status and timing to plan the day, find deposit issues or review completed/cancelled appointments." },
      { route: "/dashboard/vendor/bookings", selector: '[data-tour="booking-list"]', title: "Booking cards", body: "Open a card to review customer, service, time, payment mode, deposit, staff and customer notes." },
      { route: "/dashboard/vendor/bookings", selector: '[data-tour="booking-card"]', activateSelector: '[data-tour="booking-expand"]', title: "Open a booking safely", body: "The card expands in place. Review all details before confirming, cancelling, adding a meeting link or recording attendance. The tour does not submit an action." },
      field("/dashboard/vendor/bookings", "vendorNote", "Private vendor note", "Record operational details for your team. The customer should not see this field."),
      field("/dashboard/vendor/bookings", "meetingUrl", "Meeting link", "For virtual bookings, add the correct private session link. Verify it before the appointment."),
      { title: "Update the booking", body: "Confirm, reschedule, cancel or complete only when appropriate. Communicate changes to the customer and follow the cancellation/refund rules." },
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-calendar"]', title: "Prevent conflicts", body: "Keep service and staff availability current so customers cannot reserve unavailable time." },
    ],
  },
  subscribers: {
    label: "Subscribers", description: "Read recurring revenue, renewal and cancellation status.", category: "Customers & fulfilment", duration: "4 min",
    steps: [
      routeStep("/dashboard/vendor/subscribers", "Subscriber manager", "This page tracks customers enrolled in recurring services."),
      { route: "/dashboard/vendor/subscribers", selector: '[data-tour="subscriber-summary"]', title: "Subscriber summary", body: "Active subscribers shows current relationships. Recurring revenue is gross before commission and is not automatically the available payout balance." },
      { route: "/dashboard/vendor/subscribers", selector: '[data-tour="subscriber-active"]', title: "Active subscriptions", body: "Review customer, service, price, status, start date and next renewal. Past due and ending soon need attention." },
      { route: "/dashboard/vendor/subscribers", selector: '[data-tour="subscriber-past"]', title: "Past subscriptions", body: "Use this history to understand cancellations and former recurring relationships; do not treat them as active access." },
      { title: "Changes and communication", body: "Notify customers before material changes to benefits, timing or price, and follow the cancellation terms stated on the service." },
    ],
  },
  events: {
    label: "Manage events", description: "Operate event listings, tickets, attendees and check-in.", category: "Create & sell", duration: "6 min",
    steps: [
      routeStep("/dashboard/vendor/events", "Event manager", "Create, publish and operate ticketed or free events from this page."),
      { route: "/dashboard/vendor/events", selector: '[href="/dashboard/vendor/events/new"]', title: "Create an event", body: "Build the event details first, then add ticket types after saving unless it is a free event." },
      { route: "/dashboard/vendor/events", selector: '[data-tour="events-filters"]', title: "Search and filter", body: "Find draft, published, completed or cancelled events and avoid editing the wrong event." },
      { route: "/dashboard/vendor/events", selector: '[data-tour="events-list"]', title: "Event cards", body: "Check date, venue, status and sold count. Open the actions menu for edit, tickets, attendees, check-in or cancellation." },
      { title: "Ticket operations", body: "Set ticket inventory and sales windows, monitor attendees, scan QR tickets once, review duplicate scans and use transfers according to policy." },
    ],
  },
  eventCreate: {
    label: "Create an event", description: "Every event field from details through registration and publishing.", category: "Create & sell", duration: "12 min",
    steps: [
      routeStep(EVENT_ROUTE, "New event form", "Complete every relevant field before saving. Ticket types are managed after the event exists unless the event is free."),
      field(EVENT_ROUTE, "title", "Event title", "Use the official public name. Include the edition or year only when it helps distinguish the event."),
      field(EVENT_ROUTE, "category", "Event category", "Choose the closest category to place the event in the correct marketplace filters."),
      field(EVENT_ROUTE, "description", "Event description", "Explain the experience, schedule highlights, inclusions, audience, entry requirements and important rules."),
      field(EVENT_ROUTE, "organiserName", "Organiser name", "Add the recognised organiser or promoter name when it differs from the store."),
      { route: EVENT_ROUTE, selector: '[data-tour="event-type"]', title: "Single or multi-day", body: "Single-day uses one date. Multi-day reveals an end date/time and should cover the full event period." },
      field(EVENT_ROUTE, "startDate", "Start date", "Choose the actual local event date."),
      field(EVENT_ROUTE, "startTime", "Start time", "Enter the advertised start time and clarify doors/opening time in the description if different."),
      field(EVENT_ROUTE, "endDate", "End date", "For multi-day events, enter the final date."),
      field(EVENT_ROUTE, "endTime", "End time", "For multi-day events, enter the expected final time."),
      field(EVENT_ROUTE, "ageRestriction", "Age restriction", "State All ages, 18+ or the applicable restriction. Organisers are responsible for enforcing it."),
      field(EVENT_ROUTE, "dressCode", "Dress code", "Add only a real entry requirement or useful expectation."),
      { route: EVENT_ROUTE, selector: '[data-tour="event-lineup"]', title: "Entertainment and lineup", body: "Add performers, speakers or activities customers are promised. Keep the lineup current and communicate material changes." },
      { route: EVENT_ROUTE, selector: '[data-tour="event-location-type"]', title: "Location type", body: "Choose In-person, Online or Hybrid. The form displays the venue and/or stream fields required for that choice." },
      field(EVENT_ROUTE, "venueName", "Venue name", "Use the official venue name customers can recognise."),
      field(EVENT_ROUTE, "address", "Venue address", "Give an accurate address and include useful access guidance in the description."),
      field(EVENT_ROUTE, "region", "Event region", "Choose the region containing the venue so map and regional discovery work correctly."),
      field(EVENT_ROUTE, "streamUrl", "Stream URL", "For online/hybrid events, add the correct access URL. Protect private access where tickets are required."),
      { route: EVENT_ROUTE, selector: '[data-tour="event-free"]', title: "Free event", body: "Enable only when entry requires no paid ticket. Decide separately whether registration is still required." },
      { route: EVENT_ROUTE, selector: '[data-tour="event-cover"]', title: "Cover image", body: "Required before publishing. Use sharp, readable artwork sized for event cards and mobile screens." },
      { route: EVENT_ROUTE, selector: '[data-tour="event-gallery"]', title: "Gallery", body: "Add up to six supporting images that show the venue, performers or previous experience without misleading customers." },
      field(EVENT_ROUTE, "capacity", "Capacity", "Enter the safe maximum attendance. Ticket quantities across types should not exceed what can be admitted."),
      field(EVENT_ROUTE, "refundPolicyType", "Refund policy", "Choose the actual refund rule and apply it consistently. Explain special conditions in the event description."),
      field(EVENT_ROUTE, "refundCutoffHours", "Refund cutoff", "When the policy uses a cutoff, enter how many hours before the event refund eligibility ends."),
      { route: EVENT_ROUTE, selector: '[data-tour="event-registration"]', title: "Registration required", body: "Enable when free or paid attendees must register. Registration captures attendance details even without a ticket price." },
      field(EVENT_ROUTE, "registrationDeadline", "Registration deadline", "Set the last date registration is accepted. Leave enough time for operational planning."),
      { route: EVENT_ROUTE, selector: '[data-tour="event-seating"]', title: "Assigned seating", body: "Enable only when specific seats are managed. Do not promise assigned seats without a complete seating operation." },
      { route: EVENT_ROUTE, selector: '[data-tour="event-actions"]', title: "Save the event", body: "Save, add ticket types where needed, preview the public page, test registration or ticket purchase, then publish." },
    ],
  },
  requests: {
    label: "Customer requests", description: "Evaluate, quote, decline, cancel and complete custom work.", category: "Customers & fulfilment", duration: "6 min",
    steps: [
      routeStep("/dashboard/vendor/requests", "Custom requests", "Requests are customer enquiries requiring a vendor decision, custom amount or operational response."),
      { route: "/dashboard/vendor/requests", selector: '[data-tour="request-filters"]', title: "Request filters", body: "Separate pending, accepted, declined, cancelled and completed work so new requests are not missed." },
      { route: "/dashboard/vendor/requests", selector: '[data-tour="request-list"]', title: "Read the request", body: "Review service, customer description, location, timing, attachments and budget before deciding." },
      { route: "/dashboard/vendor/requests", selector: '[data-tour="request-card"]', activateSelector: '[data-tour="request-expand"]', title: "Open the request details", body: "Expand the request to inspect its full scope and available response controls. The tour will never accept, decline, quote or complete it for you." },
      field("/dashboard/vendor/requests", "amount", "Your quoted amount", "Enter the agreed TTD amount based on the actual scope. Explain what is included before sending."),
      field("/dashboard/vendor/requests", "paymentMethod", "Payment method", "Choose the permitted payment flow. Online payment is recorded by LinkWe; pay-on-arrival amounts do not become payout funds."),
      field("/dashboard/vendor/requests", "vendorNote", "Response note", "Give clear next steps, timing and any conditions the customer must accept."),
      field("/dashboard/vendor/requests", "reason", "Decline or cancellation reason", "Give a brief professional reason. The customer may see it, so do not include private internal comments."),
      { title: "Close the lifecycle", body: "Keep accepted requests updated and mark complete only after the work is delivered. Cancel promptly when the work cannot proceed." },
    ],
  },
  store: {
    label: "Complete the store profile", description: "Every storefront identity, trust and discovery field.", category: "Get started", duration: "10 min",
    steps: [
      routeStep("/dashboard/vendor/store/edit", "Store profile", "This information builds customer trust and controls what appears on the public storefront."),
      field("/dashboard/vendor/store/edit", "name", "Store name", "Use the consistent public business name customers know."),
      field("/dashboard/vendor/store/edit", "slug", "Store link", "This is the unique public store URL. Change it cautiously because old shared links may stop working."),
      field("/dashboard/vendor/store/edit", "tagline", "Tagline", "Write one short line that says what you sell or the main customer benefit."),
      field("/dashboard/vendor/store/edit", "logo", "Store logo", "Upload a clear logo with correct contrast and minimal empty space. It appears in compact cards and navigation."),
      field("/dashboard/vendor/store/edit", "region", "Operating region", "Choose where the business is based. The exact map location is set separately."),
      field("/dashboard/vendor/store/edit", "categoryId", "Store category", "Choose the primary category that best represents the business."),
      field("/dashboard/vendor/store/edit", "description", "About the store", "Explain the business, products/services, experience, audience and differentiators in up to 1,000 characters."),
      field("/dashboard/vendor/store/edit", "coverPhoto", "Cover photo", "Use a wide, high-quality banner—recommended 1200 × 400px—that remains readable behind storefront text."),
      { route: "/dashboard/vendor/store/edit", selector: '[data-tour="store-hours"]', title: "Opening hours", body: "Set each day accurately. Use multiple slots for split hours and close days when the business is unavailable." },
      { route: "/dashboard/vendor/store/edit", selector: '[data-tour="store-location"]', title: "Exact location", body: "Search the address and move the map pin to the correct spot. This supports maps, pickup and customer confidence." },
      field("/dashboard/vendor/store/edit", "tags", "Store tags", "Add comma-separated discovery terms that accurately describe the business."),
      { route: "/dashboard/vendor/store/edit", selector: '[data-tour="store-amenities"]', title: "Amenities", body: "Select only amenities customers can actually expect, such as parking or accessibility features." },
      field("/dashboard/vendor/store/edit", "policies", "Store policies", "State returns, shipping, cancellation, payment and other rules customers should know before purchase."),
      field("/dashboard/vendor/store/edit", "social_instagram", "Instagram", "Enter the handle only—not the full URL."),
      field("/dashboard/vendor/store/edit", "social_facebook", "Facebook", "Enter the page path or handle."),
      field("/dashboard/vendor/store/edit", "social_tiktok", "TikTok", "Enter the business handle."),
      field("/dashboard/vendor/store/edit", "social_youtube", "YouTube", "Enter the channel handle."),
      field("/dashboard/vendor/store/edit", "social_x", "X", "Enter the account handle."),
      field("/dashboard/vendor/store/edit", "social_linkedin", "LinkedIn", "Enter the profile or business page path expected by the field."),
      field("/dashboard/vendor/store/edit", "social_whatsapp", "WhatsApp", "Enter the 7-digit Trinidad & Tobago business number."),
      field("/dashboard/vendor/store/edit", "social_website", "Website", "Enter the domain without duplicating https://."),
      { route: "/dashboard/vendor/store/edit", selector: '[data-tour="store-gallery"]', title: "Store gallery", body: "Upload up to ten strong images of products, work, team or premises. Arrange the best images first." },
      { route: "/dashboard/vendor/store/edit", selector: '[data-tour="store-save"]', title: "Save and preview", body: "Save changes, open the public store and check mobile/desktop appearance, links, map, hours and policies." },
    ],
  },
  partners: {
    label: "Collab", description: "Review, approve, cancel and manage cross-store collaborations.", category: "Business operations", duration: "4 min",
    steps: [routeStep("/dashboard/vendor/partners", "Store collaborations", "Collab lets approved vendors showcase one another’s products, services or events."),
      { route: "/dashboard/vendor/partners", selector: '[data-tour="collab-incoming"]', title: "Requests to feature your work", body: "Review the requesting store and exact item. Approve only relevant collaborations; reject unclear or unsuitable requests." },
      { route: "/dashboard/vendor/partners", selector: '[data-tour="collab-outgoing"]', title: "Requests you sent", body: "Track pending, approved and rejected requests. Cancel pending requests when plans change and remove collaborations that are no longer useful." },
      { title: "Start a collaboration", body: "Open an eligible product, service or event from another vendor and use its collaboration request control. Review the public item before requesting it." }],
  },
  shipping: {
    label: "CSF delivery & pickup", description: "Learn the managed courier flow, distance pricing and local pickup.", category: "Business operations", duration: "5 min",
    steps: [routeStep("/dashboard/vendor/shipping", "Delivery setup", "CSF Couriers handles all delivered product orders through LinkWe. Vendors prepare parcels; customers may also choose pickup where offered."),
      { route: "/dashboard/vendor/shipping", selector: '[data-tour="shipping-methods"]', title: "How CSF delivery works", body: "Pack the paid order, mark it ready, and hand it to the CSF courier arranged by LinkWe. You do not set or collect a separate vendor delivery charge." },
      { route: "/dashboard/vendor/shipping", selector: '[data-tour="shipping-zones"]', title: "Distance-based customer price", body: "LinkWe calculates the customer price from your saved store pin to their checkout pin. Accurate store coordinates and packaged weight prevent incorrect quotes." },
      { route: "/dashboard/vendor/shipping", selector: '[data-tour="shipping-pickup"]', title: "Offer local pickup", body: "Pickup is controlled on each product. A pickup order uses Ready for pickup and Picked up—not courier statuses—and has no delivery fee." },
      { title: "Before publishing products", body: "Confirm your store pin, enter the full packaged weight, and enable delivery and/or pickup on every physical product." }],
  },
  staff: {
    label: "Staff & availability", description: "Build schedules and prevent appointment conflicts.", category: "Business operations", duration: "6 min",
    steps: [routeStep("/dashboard/vendor/staff", "Availability centre", "Availability controls when customers can book each service and prevents unrealistic schedules."),
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-store-hours"]', title: "Master store hours", body: "These are the default hours inherited by services. Edit the store schedule first when the whole business follows the same hours." },
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-services"]', title: "Service availability", body: "Each service shows duration, buffer, schedule and booking limit. The switch temporarily accepts or stops bookings for that service." },
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-edit"]', activateSelector: '[data-tour="availability-edit"]', title: "Edit a service schedule", body: "Open the editor to set duration, buffer, inherited or custom hours and a maximum number of bookings per day." },
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-editor"]', title: "Build realistic bookable time", body: "Choose only days and hours you can honour. Include setup, travel and recovery time in the buffer." },
      { route: "/dashboard/vendor/staff", selector: '[data-tour="availability-save"]', title: "Save and test", body: "Save availability, then open the public service and confirm the expected slots appear without overlaps." }],
  },
  finance: {
    label: "Finance & payouts", description: "Understand balances, fees, transactions, plans and payout requests.", category: "Business operations", duration: "7 min",
    steps: [routeStep("/dashboard/vendor/finance", "Finance dashboard", "Finance records eligible sales, commission, balance activity, plan billing and payouts."),
      { route: "/dashboard/vendor/finance", selector: '[data-tour="finance-balances"]', title: "Balance cards", body: "Gross sales, pending funds and available balance are different. Only eligible net funds can be requested for payout." },
      { route: "/dashboard/vendor/finance", selector: '[data-tour="finance-plan"]', title: "Plan and commission", body: "Review Starter, Growth or Pro pricing, product/service commission and plan limits. Event tickets use their separate current rate." },
      { route: "/dashboard/vendor/finance", selector: '[data-tour="finance-transactions"]', title: "Transactions", body: "Open the ledger detail to understand the order, gross amount, commission, net credit, adjustments or payout debit." },
      { route: "/dashboard/vendor/finance", selector: '[data-tour="finance-payout-details"]', title: "Bank details", body: "Keep bank name, account holder and account number accurate. Never send bank credentials through customer messages." },
      { route: "/dashboard/vendor/finance", selector: '[data-tour="finance-payout-request"]', title: "Request a payout", body: "Request no more than the available balance. Confirm bank details and wait for the payout status rather than counting it twice." },
      { title: "Pay on arrival", body: "Pay-on-arrival service money is collected directly and must not count as LinkWe available balance or payout funds." },
      { title: "Refunds and reversals", body: "A refund or cancellation can reduce earnings. Review the related transaction before promising a vendor balance amount." }],
  },
  reports: {
    label: "Business reports", description: "Read sales trends, customer reach, completion and product performance.", category: "Business operations", duration: "5 min",
    steps: [routeStep("/dashboard/vendor/reports", "Reports dashboard", "Reports turns paid LinkWe order activity into a practical view of how the store is performing."),
      { route: "/dashboard/vendor/reports", selector: '[data-tour="reports-kpis"]', title: "Headline performance", body: "Gross sales is before commission. Orders shows workload, Customers counts unique buyers and Completion shows delivered or completed orders." },
      { route: "/dashboard/vendor/reports", selector: '[data-tour="reports-trend"]', title: "Six-month sales trend", body: "Compare monthly direction and order volume. Open Finance when you need net earnings, commission or available payout balance." },
      { route: "/dashboard/vendor/reports", selector: '[data-tour="reports-products"]', title: "Top products", body: "Use quantity and gross revenue together to understand which products attract demand and contribute most sales." }],
  },
  messages: {
    label: "Messages", description: "Find, filter and manage customer conversations professionally.", category: "Customers & fulfilment", duration: "5 min",
    steps: [routeStep("/dashboard/vendor/messages", "Messages inbox", "Use Messages for customer questions and work-related communication tied to LinkWe."),
      { route: "/dashboard/vendor/messages", selector: '[data-tour="message-search"]', title: "Search", body: "Search by customer, subject or relevant text to find an older conversation quickly." },
      { route: "/dashboard/vendor/messages", selector: '[data-tour="message-filters"]', title: "Conversation filters", body: "Filter unread, orders, services and other message types so priority conversations are not missed." },
      { route: "/dashboard/vendor/messages", selector: '[data-tour="message-list"]', title: "Conversation list", body: "Read the customer, context, last message, time and unread status before opening." },
      { route: "/dashboard/vendor/messages", selector: 'a[href^="/dashboard/vendor/messages/"]', navigateSelector: 'a[href^="/dashboard/vendor/messages/"]', title: "Open a conversation", body: "We’ll open the first available conversation to demonstrate the complete messaging workspace without sending anything." },
      { selector: '[data-tour="message-thread"]', title: "Conversation thread", body: "Keep commitments and order/service context in the correct conversation. Be clear, timely and professional." },
      { selector: '[data-tour="message-composer"]', title: "Practise a reply", body: "You can type here while the tour remains open. Nothing is sent unless you deliberately press Send. Never request passwords, card data or unnecessary identity documents." },
      { title: "Resolve the next action", body: "End with who will do what and when. Return to unread conversations and follow through on promises." }],
  },
  reviews: {
    label: "Reviews", description: "Read feedback, respond professionally and improve the store.", category: "Customers & fulfilment", duration: "4 min",
    steps: [routeStep("/dashboard/vendor/reviews", "Store reviews", "Reviews show customer feedback and contribute to public trust."),
      { route: "/dashboard/vendor/reviews", selector: '[data-tour="review-summary"]', title: "Rating summary", body: "Look at the distribution and total review count, not only the average." },
      { route: "/dashboard/vendor/reviews", selector: '[data-tour="review-list"]', title: "Review details", body: "Read the order/service context and identify specific praise or failure patterns." },
      { route: "/dashboard/vendor/reviews", selector: '[data-tour="review-response"]', title: "Respond professionally", body: "Acknowledge the experience, stay factual, protect privacy and explain a remedy without arguing." },
      { title: "Improve the operation", body: "When feedback repeats, update the listing, policy, packaging, schedule or fulfilment process." }],
  },
  settings: {
    label: "Account settings", description: "Keep account, security and notification details current.", category: "Business operations", duration: "4 min",
    steps: [routeStep("/dashboard/vendor/settings", "Vendor settings", "Settings is organised into Account, Security, Business and Billing & access."),
      { route: "/dashboard/vendor/settings", selector: '[data-tour="settings-tabs"]', title: "Settings sections", body: "Use Account for your identity, Security for password and sessions, Business for store operations, and Billing & access for finance, reports, plans and Rex." },
      { route: "/dashboard/vendor/settings", selector: '[data-tour="settings-profile"]', title: "Personal details", body: "Keep the responsible person’s name, phone and email current. Store branding belongs in Store profile." },
      { route: "/dashboard/vendor/settings?tab=security", selector: '[data-tour="settings-security"]', title: "Password and session security", body: "Use a strong unique password, protect email access and sign out on shared devices." },
      { route: "/dashboard/vendor/settings?tab=security", selector: '[data-tour="settings-signout"]', title: "Sign out safely", body: "Sign out when using a shared or public device. This does not delete the store." },
      { route: "/dashboard/vendor/settings?tab=business", title: "Business shortcuts", body: "Open store profile, shipping, availability, Collab, products and services from this section." },
      { route: "/dashboard/vendor/settings?tab=billing", title: "Billing and access", body: "Open Finance, bank details, payout history, reports, Rex usage and current plans from this section." }],
  },
  rex: {
    label: "Rex business assistant", description: "Use AI safely for analysis, listings and store work.", category: "Business operations", duration: "5 min",
    steps: [routeStep("/dashboard/vendor/ai-assistant", "Meet Rex", "Rex can help eligible vendors analyse the business and create or improve store content. Review every proposed change before accepting it."),
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-usage"]', title: "AI allowance", body: "Growth and Pro include monthly uses. Each message consumes a use; top-ups follow current pricing." },
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-history"]', title: "Chat history", body: "Open prior conversations when continuing the same task. Start a new chat for unrelated work." },
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-images"]', title: "Product images", body: "Upload clear images when asking Rex to build a listing. Remove private or unrelated images first." },
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-prompts"]', title: "Ask a precise question", body: "State the goal, product/service, audience, constraints and what Rex may change. Specific instructions produce safer results." },
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-composer"]', title: "Send and review", body: "Read the response, verify prices, inventory, policy and claims, then confirm only the changes you intend." },
      { route: "/dashboard/vendor/ai-assistant", selector: '[data-tour="rex-bulk"]', title: "Bulk upload", body: "Use Bulk Upload for structured catalogue work. Review the generated rows before committing them." },
      { title: "Rex safety rule", body: "Rex assists; the vendor remains responsible for accuracy. Never provide passwords, full card data or unnecessary customer identity information." }],
  },
} satisfies Record<string, TutorialDefinition>;

export type TutorialName = keyof typeof tutorialCatalog;
export const tutorialCategories: TutorialCategory[] = ["Get started", "Create & sell", "Customers & fulfilment", "Business operations"];
