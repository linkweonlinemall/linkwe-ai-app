type CategoryItem = { value: string; label: string; emoji: string };
type CategoryGroup = { group: string; items: CategoryItem[] };

export const STORE_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Retail & Products",
    items: [
      { value: "fashion_clothing",      label: "Fashion & Clothing",    emoji: "🛍️" },
      { value: "shoes_accessories",     label: "Shoes & Accessories",   emoji: "👟" },
      { value: "beauty_cosmetics",      label: "Beauty & Cosmetics",    emoji: "💄" },
      { value: "home_living",           label: "Home & Living",         emoji: "🏠" },
      { value: "electronics",           label: "Electronics",           emoji: "📱" },
      { value: "food_groceries",        label: "Food & Groceries",      emoji: "🍎" },
      { value: "books_stationery",      label: "Books & Stationery",    emoji: "📚" },
      { value: "toys_games",            label: "Toys & Games",          emoji: "🎮" },
    ],
  },
  {
    group: "Food & Hospitality",
    items: [
      { value: "restaurant_cafe",       label: "Restaurant & Café",     emoji: "🍽️" },
      { value: "fast_food_takeaway",    label: "Fast Food & Takeaway",  emoji: "🍕" },
      { value: "bakery_pastry",         label: "Bakery & Pastry",       emoji: "🎂" },
      { value: "bar_lounge",            label: "Bar & Lounge",          emoji: "🍹" },
      { value: "hotel_accommodation",   label: "Hotel & Accommodation", emoji: "🏨" },
    ],
  },
  {
    group: "Services",
    items: [
      { value: "barbershop_salon",      label: "Barbershop & Salon",    emoji: "💈" },
      { value: "fitness_wellness",      label: "Fitness & Wellness",    emoji: "💪" },
      { value: "home_services",         label: "Home Services",         emoji: "🔧" },
      { value: "photography_media",     label: "Photography & Media",   emoji: "📸" },
      { value: "education_tutoring",    label: "Education & Tutoring",  emoji: "🎓" },
      { value: "professional_services", label: "Professional Services", emoji: "⚖️" },
      { value: "automotive",            label: "Automotive",            emoji: "🚗" },
    ],
  },
  {
    group: "Events & Entertainment",
    items: [
      { value: "events_parties",        label: "Events & Parties",      emoji: "🎉" },
      { value: "music_entertainment",   label: "Music & Entertainment", emoji: "🎵" },
      { value: "arts_culture",          label: "Arts & Culture",        emoji: "🎭" },
    ],
  },
  {
    group: "Real Estate & Vehicles",
    items: [
      { value: "real_estate",           label: "Real Estate",           emoji: "🏡" },
      { value: "vehicle_sales_rentals", label: "Vehicle Sales & Rentals", emoji: "🚙" },
    ],
  },
  {
    group: "Other",
    items: [
      { value: "other",                 label: "Other",                 emoji: "📦" },
    ],
  },
];
