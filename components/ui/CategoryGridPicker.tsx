"use client";

import { useState } from "react";

type CategoryItem = {
  value: string;
  label: string;
  emoji: string;
};

type CategoryGroup = {
  group: string;
  items: CategoryItem[];
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Retail & Products",
    items: [
      { value: "clothing_apparel", label: "Fashion & Clothing", emoji: "🛍️" },
      { value: "shoes_accessories", label: "Shoes & Accessories", emoji: "👟" },
      { value: "health_beauty", label: "Beauty & Cosmetics", emoji: "💄" },
      { value: "home_furniture", label: "Home & Living", emoji: "🏠" },
      { value: "electronics", label: "Electronics", emoji: "📱" },
      { value: "food_beverages", label: "Food & Groceries", emoji: "🍎" },
      { value: "books_stationery", label: "Books & Stationery", emoji: "📚" },
      { value: "gaming", label: "Toys & Games", emoji: "🎮" },
    ],
  },
  {
    group: "Food & Hospitality",
    items: [
      { value: "restaurant_cafe", label: "Restaurant & Café", emoji: "🍽️" },
      { value: "fast_food", label: "Fast Food & Takeaway", emoji: "🍕" },
      { value: "bakery_pastries", label: "Bakery & Desserts", emoji: "🎂" },
      { value: "bar_nightlife", label: "Bar & Nightlife", emoji: "🍹" },
      { value: "hotel_accommodation", label: "Hotel & Accommodation", emoji: "🏨" },
    ],
  },
  {
    group: "Services",
    items: [
      { value: "barbershop_salon", label: "Barbershop & Salon", emoji: "💈" },
      { value: "fitness_wellness", label: "Fitness & Wellness", emoji: "💪" },
      { value: "home_services", label: "Home Services & Repairs", emoji: "🔧" },
      { value: "photography_media", label: "Photography & Media", emoji: "📸" },
      { value: "education_tutoring", label: "Education & Tutoring", emoji: "🎓" },
      { value: "professional_services", label: "Professional Services", emoji: "⚖️" },
      { value: "automotive", label: "Automotive", emoji: "🚗" },
    ],
  },
  {
    group: "Events & Entertainment",
    items: [
      { value: "events_parties", label: "Events & Parties", emoji: "🎉" },
      { value: "music_entertainment", label: "Music & Entertainment", emoji: "🎵" },
      { value: "arts_culture", label: "Arts & Culture", emoji: "🎭" },
    ],
  },
  {
    group: "Real Estate & Vehicles",
    items: [
      { value: "real_estate", label: "Real Estate", emoji: "🏡" },
      { value: "vehicle_sales_rentals", label: "Vehicle Sales & Rentals", emoji: "🚙" },
    ],
  },
  {
    group: "Other",
    items: [
      { value: "other", label: "Other", emoji: "📦" },
    ],
  },
];

// Flat list for lookup
const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap((g) => g.items);

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
};

export default function CategoryGridPicker({ name, defaultValue = "", required }: Props) {
  const [selected, setSelected] = useState(defaultValue);

  // If defaultValue doesn't match any known category, still allow it
  const selectedItem = ALL_CATEGORIES.find((c) => c.value === selected);

  return (
    <div>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selected} required={required} />

      <div className="flex flex-col gap-5">
        {CATEGORY_GROUPS.map((group) => (
          <div key={group.group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {group.group}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.items.map((item) => {
                const isSelected = selected === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelected(item.value)}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                      isSelected
                        ? "border-[#D4450A] bg-[#D4450A]/5"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-3xl leading-none">{item.emoji}</span>
                    <span
                      className={`text-sm font-medium leading-tight ${
                        isSelected ? "text-[#D4450A]" : "text-zinc-700"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Show current selection if from outside the known list */}
      {selected && !selectedItem && (
        <p className="mt-2 text-xs text-zinc-500">
          Current category: <span className="font-medium">{selected}</span>
        </p>
      )}
    </div>
  );
}
