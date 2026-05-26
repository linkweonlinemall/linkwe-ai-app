"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { AmenityLucideIcon } from "@/components/icons/amenity-lucide";
import { icn } from "@/lib/iconography";

const AMENITY_GROUPS = [
  {
    label: "Access & Facilities",
    amenities: [
      { value: "free_wifi", label: "Free WiFi" },
      { value: "parking_available", label: "Parking available" },
      { value: "wheelchair_accessible", label: "Wheelchair accessible" },
      { value: "air_conditioned", label: "Air conditioned" },
      { value: "outdoor_seating", label: "Outdoor seating" },
      { value: "indoor_seating", label: "Indoor seating" },
      { value: "waiting_area", label: "Waiting area" },
      { value: "private_rooms", label: "Private rooms" },
    ],
  },
  {
    label: "Payments & Pricing",
    amenities: [
      { value: "card_payments", label: "Card payments accepted" },
      { value: "cash_accepted", label: "Cash accepted" },
      { value: "linx_accepted", label: "LINX accepted" },
      { value: "online_payment", label: "Online payment" },
      { value: "free_consultation", label: "Free consultation" },
      { value: "payment_plans", label: "Payment plans available" },
      { value: "deposits_required", label: "Deposit required" },
    ],
  },
  {
    label: "Service Options",
    amenities: [
      { value: "home_visits", label: "Home visits available" },
      { value: "mobile_service", label: "Mobile service" },
      { value: "virtual_sessions", label: "Virtual sessions available" },
      { value: "same_day_service", label: "Same day service" },
      { value: "emergency_service", label: "Emergency service" },
      { value: "weekend_available", label: "Available weekends" },
      { value: "evening_available", label: "Evening appointments" },
      { value: "walk_ins_welcome", label: "Walk-ins welcome" },
      { value: "by_appointment_only", label: "By appointment only" },
    ],
  },
  {
    label: "Health & Safety",
    amenities: [
      { value: "sanitized_equipment", label: "Sanitized equipment" },
      { value: "gloves_used", label: "Gloves used" },
      { value: "masks_available", label: "Masks available" },
      { value: "vaccinated_staff", label: "Vaccinated staff" },
      { value: "insured", label: "Fully insured" },
      { value: "certified_staff", label: "Certified staff" },
    ],
  },
  {
    label: "Family & Lifestyle",
    amenities: [
      { value: "pet_friendly", label: "Pet friendly" },
      { value: "family_friendly", label: "Family friendly" },
      { value: "child_friendly", label: "Child friendly" },
      { value: "refreshments", label: "Refreshments provided" },
      { value: "loyalty_program", label: "Loyalty program" },
    ],
  },
  {
    label: "Delivery & Logistics",
    amenities: [
      { value: "delivery_available", label: "Delivery available" },
      { value: "pickup_available", label: "Pickup available" },
      { value: "free_delivery", label: "Free delivery" },
      { value: "express_delivery", label: "Express delivery" },
      { value: "installation_included", label: "Installation included" },
      { value: "removal_service", label: "Removal/disposal service" },
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
                        <AmenityLucideIcon value={amenity.value} className={icn.button} />
                        <span className="text-sm font-medium text-zinc-700">{amenity.label}</span>
                        {isSelected ? (
                          <Check
                            className="ml-auto size-[14px] shrink-0 text-[#D4450A] stroke-[3]"
                            aria-hidden
                          />
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
