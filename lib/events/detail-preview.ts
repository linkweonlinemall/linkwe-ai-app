import "server-only";
import type { EventDetailData } from "./detail";
import type { ContentLinkItem } from "@/lib/content-links/types";

// Public event content observed on 22 September 2026. No private event identifiers or access URLs.
export function eventDetailPreview(): { event: EventDetailData; linkedItems: ContentLinkItem[] } | null {
  if (process.env.NODE_ENV !== "development") return null;
  const event: EventDetailData = {
    id: "preview-aloha", slug: "aloha-mimosas-breakfast-party-experience", title: "Aloha & Mimosas Breakfast Party Experience",
    description: "<p>Escape to the islands without leaving Trinidad!</p><p>Join us for a tropical Hawaiian-inspired breakfast experience filled with delicious food, refreshing drinks, great music, and island vibes.</p><p>Dress in your favorite floral shirts, tropical dresses, and beachwear as we transform the venue into a Hawaiian paradise complete with tiki décor, palm trees, and unforgettable breakfast dishes.</p><p>Whether you're coming with friends, family, or your significant other, this is the perfect way to start your weekend.</p><ul><li>Hawaiian Theme</li><li>Food Inclusive</li><li>Unlimited Vibes</li><li>Live DJ</li><li>Photo Booth</li><li>Tropical Cocktails Available</li></ul>",
    category: "breakfast_fete", tags: [], organiserName: null,
    startDate: new Date("2026-10-28T08:00:00-04:00"), endDate: null, isOnline: false, venueName: "La Vega Estate", address: null, latitude: null, longitude: null, region: "buccoo",
    capacity: 1500, dressCode: "Tropical Chic", ticketPrice: null, ticketUrl: null, refundPolicy: null,
    registrationRequired: false, registrationDeadline: null, ageRestriction: "18 and over", status: "PUBLISHED", eventType: "SINGLE",
    coverImage: "/images/home/live/events-aloha-mimosas-breakfast-party-experience.webp",
    galleryImages: [
      "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780606322/linkwe/events/yvzafp3tmxtvgeyq1sau.png",
      "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780606328/linkwe/events/bp6jvfimnhulzdi24wxe.png",
      "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780606339/linkwe/events/dkxd4zmlz0txfvuclraw.png",
    ],
    hasSeating: false,
    lineup: [
      { name: "Fabio", role: "Headliner", type: "DJ", imageUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780501265/linkwe/events/lineup/dly0up38xe2eiz7qywnq.png" },
      { name: "Susie", role: "Headliner", type: "DJ", imageUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780501304/linkwe/events/lineup/ltecesbuygdpdpth5zkv.png" },
      { name: "RunDCrowd", role: "Headliner", type: "DJ", imageUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1780501341/linkwe/events/lineup/dyavhapem9r6sjaz3zrk.png" },
    ],
    refundPolicyType: "NONE", refundCutoffHours: 48,
    store: { name: "Speak Loud Co.", slug: "speak-loud", region: "el dorado", logoUrl: "https://res.cloudinary.com/dosxxjwnh/image/upload/v1779294391/linkwe/kyc/ojzu17eezvtb18vjnq5a.png" },
    ticketTypes: [
      { id: "preview-general", name: "General", price: 300, quantity: null, quantitySold: null, description: "Experience the tropical vibes, delicious breakfast, and unforgettable atmosphere of Aloha & Mimosas.", perks: "Includes:\n\n✅ Event Entry\n✅ Full Breakfast Buffet\n✅ Fresh Fruit Station\n✅ Complimentary Juice Station\n✅ Access to DJ Entertainment\n✅ Access to Games & Activities\n✅ Access to Photo Areas\n✅ Beachfront Event Access\n\nPerfect For:\n\nGuests looking to enjoy the food, music, and Hawaiian atmosphere with friends and family.", maxPerOrder: 10, isVisible: true, saleStartDate: null, saleEnds: null },
      { id: "preview-vip", name: "VIP", price: 500, quantity: null, quantitySold: null, description: "Upgrade your morning and enjoy the ultimate Aloha & Mimosas experience with exclusive perks and premium comfort.", perks: "Includes Everything in General Admission PLUS:\n\n⭐ Early Entry (30 Minutes Before General Admission)\n⭐ Reserved VIP Seating Area\n⭐ Premium Ocean View Seating\n⭐ Complimentary Welcome Mimosa\n⭐ VIP Gift Bag\n⭐ Dedicated VIP Check-In Line\n⭐ Priority Breakfast Access\n⭐ Complimentary Professional Event Photo\n⭐ Exclusive VIP Lounge Access\n⭐ Premium Cocktail Voucher\n\nVIP Gift Bag Includes:\n\n🌺 Hawaiian Lei Necklace\n🌺 Event Souvenir Cup\n🌺 Tropical Snack Pack\n🌺 Event Wristband\n\nPerfect For:\n\nCouples, content creators, influencers, birthday celebrations, and guests looking for a premium brunch experience.", maxPerOrder: 10, isVisible: true, saleStartDate: null, saleEnds: null },
    ],
  };
  const products = [
    ["game-over-insert-coin-tee", "Game Over Insert Coin Tee"],
    ["straight-outta-my-thirties-tee", "Straight Outta My Thirties Tee"],
    ["vintage-1986-blush-script-tee", "Vintage 1986 Blush Script Tee"],
  ];
  return { event, linkedItems: products.map(([slug, name]) => ({ linkId: "preview-" + slug, type: "PRODUCT", id: "preview-" + slug, name, slug, image: null, price: 15000, href: "https://www.linkweonlinemall.com/products/" + slug })) };
}
