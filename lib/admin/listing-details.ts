export const LISTING_DETAIL_MODELS = {
  PRODUCT: {
    model: "ListingProduct",
    relation: "listingProduct",
    delegate: "listingProduct",
  },
  REAL_ESTATE: {
    model: "ListingRealEstate",
    relation: "realEstate",
    delegate: "listingRealEstate",
  },
  VEHICLE: {
    model: "ListingVehicle",
    relation: "vehicle",
    delegate: "listingVehicle",
  },
  EVENT: { model: "ListingEvent", relation: "event", delegate: "listingEvent" },
  SERVICE: {
    model: "ListingService",
    relation: "service",
    delegate: "listingService",
  },
  RESTAURANT: {
    model: "ListingRestaurant",
    relation: "restaurant",
    delegate: "listingRestaurant",
  },
  PLACE: { model: "ListingPlace", relation: "place", delegate: "listingPlace" },
  TICKET: {
    model: "ListingTicket",
    relation: "ticket",
    delegate: "listingTicket",
  },
  DIGITAL: {
    model: "ListingDigital",
    relation: "digital",
    delegate: "listingDigital",
  },
  BOOKABLE: {
    model: "ListingBookable",
    relation: "bookable",
    delegate: "listingBookable",
  },
} as const;
