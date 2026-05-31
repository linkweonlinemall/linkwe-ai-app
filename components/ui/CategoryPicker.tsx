"use client";

import React, { useState } from "react";

type CategoryItem = { value: string; label: string; emoji: string };
type CategoryGroup = { group: string; items: CategoryItem[] };

const GROUPS: CategoryGroup[] = [
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

type Props = {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
};

export default function CategoryPicker({ name, value = "", onChange }: Props) {
  const [selected, setSelected] = useState(value);

  function select(val: string) {
    setSelected(val);
    onChange?.(val);
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-3 gap-2">
        {GROUPS.map((group, gi) => (
          <React.Fragment key={`group-${gi}`}>
            <p
              className={`col-span-3 text-[10px] uppercase tracking-wider mb-1 ${gi === 0 ? "mt-0" : "mt-3"}`}
              style={{ color: "var(--text-muted)" }}
            >
              {group.group}
            </p>
            {group.items.map((item) => {
              const isSelected = selected === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => select(item.value)}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                    isSelected
                      ? "border-[#D4450A] bg-[#D4450A]/5"
                      : "border-transparent bg-white hover:border-[#D4450A]/30 hover:bg-[#D4450A]/5"
                  }`}
                  style={{ border: isSelected ? undefined : "1px solid var(--card-border)" }}
                >
                  <span className="text-2xl leading-none">{item.emoji}</span>
                  <span className={`text-xs font-medium leading-tight ${isSelected ? "text-[#D4450A]" : "text-[#1C1C1A]"}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
