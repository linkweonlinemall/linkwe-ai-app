"use client";

import { useState } from "react";

const AMENITY_GROUPS = [
  {
    label: "Access & Facilities",
    amenities: [
      { value: "free_wifi", label: "Free WiFi", icon: "📶" },
      { value: "parking_available", label: "Parking available", icon: "🅿️" },
      { value: "wheelchair_accessible", label: "Wheelchair accessible", icon: "♿" },
      { value: "air_conditioned", label: "Air conditioned", icon: "❄️" },
      { value: "outdoor_seating", label: "Outdoor seating", icon: "🌿" },
      { value: "indoor_seating", label: "Indoor seating", icon: "🪑" },
      { value: "waiting_area", label: "Waiting area", icon: "🛋️" },
      { value: "private_rooms", label: "Private rooms", icon: "🚪" },
    ],
  },
  {
    label: "Payments & Pricing",
    amenities: [
      { value: "card_payments", label: "Card payments accepted", icon: "💳" },
      { value: "cash_accepted", label: "Cash accepted", icon: "💵" },
      { value: "linx_accepted", label: "LINX accepted", icon: "🏦" },
      { value: "online_payment", label: "Online payment", icon: "📱" },
      { value: "free_consultation", label: "Free consultation", icon: "💬" },
      { value: "payment_plans", label: "Payment plans available", icon: "📋" },
      { value: "deposits_required", label: "Deposit required", icon: "💰" },
    ],
  },
  {
    label: "Service Options",
    amenities: [
      { value: "home_visits", label: "Home visits available", icon: "🏠" },
      { value: "mobile_service", label: "Mobile service", icon: "🚗" },
      { value: "virtual_sessions", label: "Virtual sessions available", icon: "💻" },
      { value: "same_day_service", label: "Same day service", icon: "⚡" },
      { value: "emergency_service", label: "Emergency service", icon: "🚨" },
      { value: "weekend_available", label: "Available weekends", icon: "📅" },
      { value: "evening_available", label: "Evening appointments", icon: "🌙" },
      { value: "walk_ins_welcome", label: "Walk-ins welcome", icon: "🚶" },
      { value: "by_appointment_only", label: "By appointment only", icon: "📌" },
    ],
  },
  {
    label: "Health & Safety",
    amenities: [
      { value: "sanitized_equipment", label: "Sanitized equipment", icon: "🧼" },
      { value: "gloves_used", label: "Gloves used", icon: "🧤" },
      { value: "masks_available", label: "Masks available", icon: "😷" },
      { value: "vaccinated_staff", label: "Vaccinated staff", icon: "💉" },
      { value: "insured", label: "Fully insured", icon: "🛡️" },
      { value: "certified_staff", label: "Certified staff", icon: "🎓" },
    ],
  },
  {
    label: "Family & Lifestyle",
    amenities: [
      { value: "pet_friendly", label: "Pet friendly", icon: "🐾" },
      { value: "family_friendly", label: "Family friendly", icon: "👨‍👩‍👧" },
      { value: "child_friendly", label: "Child friendly", icon: "👶" },
      { value: "refreshments", label: "Refreshments provided", icon: "☕" },
      { value: "loyalty_program", label: "Loyalty program", icon: "⭐" },
    ],
  },
  {
    label: "Delivery & Logistics",
    amenities: [
      { value: "delivery_available", label: "Delivery available", icon: "🚚" },
      { value: "pickup_available", label: "Pickup available", icon: "📦" },
      { value: "free_delivery", label: "Free delivery", icon: "🎁" },
      { value: "express_delivery", label: "Express delivery", icon: "⚡" },
      { value: "installation_included", label: "Installation included", icon: "🔧" },
      { value: "removal_service", label: "Removal/disposal service", icon: "🗑️" },
    ],
  },
] as const;

export type AmenityValue = (typeof AMENITY_GROUPS)[number]["amenities"][number]["value"];

type Props = { initialAmenities: string[] };

export default function StoreAmenitiesPicker({ initialAmenities }: Props) {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialAmenities ?? []);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(
      AMENITY_GROUPS.filter((group) =>
        group.amenities.some((a) => selectedAmenities.includes(a.value)),
      ).map((group) => group.label),
    ),
  );

  return (
    <div>
      {selectedAmenities.map((a) => (
        <input key={a} type="hidden" name="amenities" value={a} />
      ))}
      <p className="mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Amenities
      </p>
      <p className="mb-5 text-xs text-zinc-500">
        Select everything that applies to your business. These show on your public store page.
      </p>
      <div className="flex flex-col gap-2">
        {AMENITY_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const selectedInGroup = group.amenities.filter((a) =>
            selectedAmenities.includes(a.value),
          ).length;

          return (
            <div
              key={group.label}
              className="overflow-hidden rounded-xl border border-zinc-200"
            >
              {/* Group header — clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => {
                  setExpandedGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.label)) next.delete(group.label);
                    else next.add(group.label);
                    return next;
                  });
                }}
                className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left transition-colors hover:bg-zinc-100"
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-zinc-800">{group.label}</p>
                  {selectedInGroup > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4450A] text-[10px] font-black text-white">
                      {selectedInGroup}
                    </span>
                  ) : null}
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Group content — collapsible */}
              {isExpanded ? (
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  {group.amenities.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity.value);
                    return (
                      <button
                        key={amenity.value}
                        type="button"
                        onClick={() =>
                          setSelectedAmenities((prev) =>
                            isSelected
                              ? prev.filter((a) => a !== amenity.value)
                              : [...prev, amenity.value]
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                          isSelected
                            ? "border-[#D4450A] bg-[#D4450A]/5"
                            : "border-zinc-100 bg-white hover:border-zinc-200"
                        }`}
                      >
                        <span className="text-base">{amenity.icon}</span>
                        <span className="text-sm font-medium text-zinc-700">{amenity.label}</span>
                        {isSelected ? (
                          <svg
                            className="ml-auto shrink-0 text-[#D4450A]"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
