import "server-only";
import { eventPriceLabel, getEventOffer, type DirectoryEvent } from "./directory-query";

/** Public details observed on LinkWe on 22 September 2026. Development-only, no invented inventory. */
export function getEventPreview(now: Date): DirectoryEvent[] {
  if (process.env.NODE_ENV !== "development") return [];
  const samples = [
    { slug: "aloha-mimosas-breakfast-party-experience", title: "Aloha & Mimosas Breakfast Party Experience", category: "breakfast_fete", startDate: new Date("2026-10-28T08:00:00-04:00"), coverImage: "/images/home/live/events-aloha-mimosas-breakfast-party-experience.webp", venueName: "La Vega Estate", region: "buccoo", ageRestriction: "18 and over", description: "A tropical Hawaiian-inspired breakfast experience with food, refreshing drinks and music.", prices: [300, 500], store: { name: "Speak Loud Co.", slug: "speak-loud", logoUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1779294391/linkwe/kyc/ojzu17eezvtb18vjnq5a.png" } },
    // The live poster is currently unavailable; use the designed no-poster state.
    { slug: "jungle-escape", title: "Jungle Escape", category: "all_inclusive_fete", startDate: new Date("2027-03-08T20:00:00-04:00"), coverImage: null, venueName: "The Jungle Grounds", region: "port_of_spain", ageRestriction: "18+", description: "An all-inclusive fete with premium drinks, gourmet bites and soca music.", prices: [0, 300, 500, 1800], store: { name: "One Mind Entertainment", slug: "one-mind-entertainment", logoUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1781990790/linkwe/kyc/ctw5pgjk7n43ndnnrwfx.png" } },
  ];
  return samples.map(({ prices, ...event }) => ({
    ...event, id: "preview-" + event.slug, endDate: null, tags: [], isOnline: false, isFeatured: false, address: null, organiserName: null, preview: true,
    offer: event.startDate <= now ? getEventOffer({ startDate: event.startDate, endDate: null, ticketTypes: [] }, now) : { state: "preview", price: Math.min(...prices), hasFree: prices.includes(0), hasPaid: prices.some(price => price > 0), label: eventPriceLabel(prices), note: "Check current availability on the event page" },
  }));
}
