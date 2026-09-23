import { mapSubscriptionInterval } from "@/lib/finance/subscription-interval";
import { validateSubscriptionConfiguration } from "@/lib/services/configuration-validation";
import { humanLabel, type RecordField } from "./record-design";
export class RecordValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super(Object.values(fields)[0] || "Please review the highlighted fields.");
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function safeUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return value.startsWith("/") && !value.startsWith("//");
  }
}
export function validateRecordValues(
  fields: RecordField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    const f = fields.find((field) => field.name === key);
    const label = humanLabel(key);
    if (!f || f.readonly) {
      errors[key] = `This field cannot be changed here: ${label}.`;
      continue;
    }
    let value =
      typeof raw === "string" && f.type !== "Password" ? raw.trim() : raw;
    if (f.list) {
      if (
        !Array.isArray(value) ||
        value.length > 100 ||
        value.some((v) => typeof v !== "string" || v.length > 2000)
      )
        errors[key] = "Use a list of up to 100 text values.";
    } else if (value === "" || value == null) {
      if (f.required) errors[key] = `${label} is required.`;
      value = null;
    } else if (f.type === "Boolean") {
      if (typeof value !== "boolean") errors[key] = "Choose on or off.";
    } else if (["Int", "Float", "Decimal"].includes(f.type)) {
      value = Number(value);
      if (
        !Number.isFinite(value) ||
        (f.type === "Int" && !Number.isInteger(value))
      )
        errors[key] =
          `Enter a valid ${f.type === "Int" ? "whole " : ""}number.`;
      else if (!["latitude", "longitude"].includes(key) && Number(value) < 0)
        errors[key] = "Use zero or a positive number.";
    } else if (f.type === "DateTime") {
      const date = new Date(String(value));
      if (!Number.isFinite(date.getTime()))
        errors[key] = "Enter a valid date and time.";
      else value = date.toISOString();
    } else if (f.type !== "Json" && typeof value !== "string")
      errors[key] = `Enter ${label.toLowerCase()} as text.`;
    if (typeof value === "string" && value.length > 30000)
      errors[key] = "This value is too long.";
    if (value != null && f.options && !f.options.includes(String(value)))
      errors[key] = "Choose an available option.";
    if (key === "email" && typeof value === "string") {
      value = value.toLowerCase();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)) ||
        String(value).length > 254
      )
        errors[key] = "Enter a valid email address.";
    }
    if (key === "phone" && value && !/^[+\d\s()-]{7,30}$/.test(String(value)))
      errors[key] = "Enter a valid phone number.";
    if (key === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value)))
      errors[key] = "Use lowercase letters, numbers and single hyphens.";
    if (
      ["latitude", "longitude"].includes(key) &&
      value != null &&
      Math.abs(Number(value)) > (key === "latitude" ? 90 : 180)
    )
      errors[key] = "Enter valid map coordinates.";
    if (
      ["name", "title", "fullName"].includes(key) &&
      typeof value === "string" &&
      value.length > 150
    )
      errors[key] = "Use no more than 150 characters.";
    if (
      [
        "logoUrl",
        "coverPhotoUrl",
        "imageUrl",
        "digitalFileUrl",
        "previewUrl",
      ].includes(key) &&
      value &&
      !safeUrl(String(value))
    )
      errors[key] = "Use a valid HTTP or HTTPS URL.";
    if (
      ["images", "storeGallery"].includes(key) &&
      Array.isArray(value) &&
      (value.length > 20 || value.some((url) => !safeUrl(String(url))))
    )
      errors[key] = "Use up to 20 valid image URLs.";
    if (
      key === "password" &&
      value &&
      (String(value).length < 12 ||
        new TextEncoder().encode(String(value)).length > 72)
    )
      errors[key] = "Use at least 12 characters and no more than 72 bytes.";
    if (key === "currency" && !/^[A-Z]{3}$/.test(String(value)))
      errors[key] = "Use a three-letter currency code, such as TTD.";
    if (key === "openingHours" && value != null) {
      if (!object(value)) errors[key] = "Choose opening hours for each day.";
      else
        for (const [day, entry] of Object.entries(value)) {
          if (
            ![
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ].includes(day) ||
            !object(entry) ||
            typeof entry.closed !== "boolean" ||
            typeof entry.allDay !== "boolean" ||
            !Array.isArray(entry.slots)
          ) {
            errors[key] = "Review the opening hours.";
            break;
          }
          if (!entry.closed && !entry.allDay) {
            const slots = entry.slots as { from?: string; to?: string }[];
            if (
              !slots.length ||
              slots.some(
                (slot) =>
                  !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.from || "") ||
                  !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.to || "") ||
                  slot.from! >= slot.to!,
              )
            )
              errors[key] = `Check the opening and closing times for ${day}.`;
            const ordered = [...slots].sort((a, b) =>
              String(a.from).localeCompare(String(b.from)),
            );
            if (
              ordered.some(
                (slot, i) => i > 0 && slot.from! < ordered[i - 1]!.to!,
              )
            )
              errors[key] = `Opening hours overlap on ${day}.`;
          }
        }
    }
    if (
      key === "socialLinks" &&
      value != null &&
      (!object(value) ||
        Object.values(value).some(
          (v) => typeof v !== "string" || v.length > 2000,
        ))
    )
      errors[key] = "Use text for each contact link.";
    if (key === "checkoutFields" && value != null) {
      if (
        !Array.isArray(value) ||
        value.length > 20 ||
        value.some(
          (f) =>
            !object(f) ||
            typeof f.id !== "string" ||
            !f.id ||
            typeof f.label !== "string" ||
            !f.label.trim() ||
            f.label.length > 120 ||
            !["text", "select", "multiselect", "upload", "checklist"].includes(
              String(f.type),
            ) ||
            typeof f.required !== "boolean" ||
            !Array.isArray(f.options) ||
            f.options.length > 30 ||
            f.options.some(
              (o) => typeof o !== "string" || !o.trim() || o.length > 80,
            ) ||
            (["select", "multiselect", "checklist"].includes(String(f.type)) &&
              f.options.length === 0),
        )
      )
        errors[key] =
          "Every question needs a label and valid options (up to 20 questions).";
      else if (new Set(value.map((f) => f.id)).size !== value.length)
        errors[key] = "Each question needs a unique ID.";
    }
    result[key] = value;
  }
  if (Object.keys(errors).length) throw new RecordValidationError(errors);
  return result;
}
export function validateRecordState(
  kind: string,
  merged: Record<string, unknown>,
  changed: string[],
) {
  const errors: Record<string, string> = {};
  const changedAny = (...keys: string[]) =>
    keys.some((key) => changed.includes(key));
  if (kind === "service") {
    if (
      merged.serviceType === "SUBSCRIPTION" &&
      changedAny(
        "serviceType",
        "price",
        "subscriptionInterval",
        "sessionsIncluded",
        "subscriptionCancellationDays",
        "subscriptionTrialPeriod",
        "subscriptionTrialPrice",
        "subscriptionCanPause",
        "subscriptionPauseMaxWeeks",
      )
    ) {
      if (!mapSubscriptionInterval(String(merged.subscriptionInterval || "")))
        errors.subscriptionInterval = "Choose a billing interval.";
      const number = (key: string) =>
        merged[key] == null || merged[key] === "" ? null : Number(merged[key]);
      const subscriptionError = validateSubscriptionConfiguration({
        serviceType: "SUBSCRIPTION",
        interval: String(merged.subscriptionInterval || ""),
        price: Number(merged.price),
        sessionsIncluded: number("sessionsIncluded"),
        cancellationDays: number("subscriptionCancellationDays"),
        trialDays: number("subscriptionTrialPeriod"),
        trialPrice: number("subscriptionTrialPrice"),
        canPause: merged.subscriptionCanPause === true,
        pauseMaxWeeks: number("subscriptionPauseMaxWeeks"),
      });
      if (subscriptionError) errors.subscriptionInterval = subscriptionError;
    }
    if (
      changedAny("serviceType", "quotePriceType") &&
      merged.serviceType === "QUOTE" &&
      !merged.quotePriceType
    )
      errors.quotePriceType = "Choose how the quote price is displayed.";
    if (
      changed.includes("availableDays") &&
      Array.isArray(merged.availableDays) &&
      merged.availableDays.some(
        (day) =>
          ![
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].includes(String(day)),
      )
    )
      errors.availableDays = "Choose valid days of the week.";

    if (
      changedAny("requiresDeposit", "depositAmount", "price") &&
      merged.requiresDeposit &&
      (!(Number(merged.depositAmount) > 0) ||
        Number(merged.depositAmount) > Number(merged.price))
    )
      errors.depositAmount =
        "The deposit must be greater than zero and no more than the service price.";
    for (const key of [
      "durationMinutes",
      "maxGroupSize",
      "maxPerDay",
      "sessionsIncluded",
    ])
      if (
        changed.includes(key) &&
        merged[key] != null &&
        Number(merged[key]) <= 0
      )
        errors[key] = "Use a value greater than zero.";
    if (
      changedAny(
        "availableFrom",
        "availableTo",
        "useStoreHours",
        "availableDays",
      ) &&
      !merged.useStoreHours
    ) {
      for (const key of ["availableFrom", "availableTo"])
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(merged[key] || "")))
          errors[key] = "Choose a time for the custom schedule.";
      if (
        merged.availableFrom &&
        merged.availableTo &&
        String(merged.availableFrom) >= String(merged.availableTo)
      )
        errors.availableTo = "The end time must be after the start time.";
      if (!Array.isArray(merged.availableDays) || !merged.availableDays.length)
        errors.availableDays = "Choose at least one day.";
    }
  }
  if (
    changedAny("isPublished", "isArchived") &&
    merged.isPublished &&
    merged.isArchived
  )
    errors.isPublished = "Restore the item from the archive before publishing.";
  if (
    kind === "product" &&
    changedAny("hasVariants", "variants") &&
    merged.hasVariants &&
    (!Array.isArray(merged.variants) || !merged.variants.length)
  )
    errors.variants = "Add at least one variation, or turn variations off.";
  if (Object.keys(errors).length) throw new RecordValidationError(errors);
}
