"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { slotInstantTrinidad } from "@/lib/timezone/trinidad";
import { prisma } from "@/lib/prisma";
import { generateEventScanCodeValue } from "@/lib/tickets/event-scan-code";
import { getPaidTicketSoldCountsForEvents } from "@/lib/tickets/sold-counts";
import { uploadFile } from "@/lib/uploads/upload";

const EVENTS_PATH = "/dashboard/vendor/events";

function sanitizeSlug(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

async function uniqueEventSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base || "event";
  for (let attempt = 0; attempt < 10; attempt++) {
    const clash = await prisma.event.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }
  return `${base}-${Date.now()}`;
}

async function getVendorStore(userId: string) {
  return prisma.store.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
}

async function assertEventOwnership(eventId: string, userId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, store: { ownerId: userId } },
    select: { id: true, storeId: true, slug: true },
  });
}

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function optFloat(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function optInt(formData: FormData, key: string): number | null {
  const v = str(formData, key);
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function optDate(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const d = slotInstantTrinidad(dateStr, timeStr || "00:00");
  return isNaN(d.getTime()) ? null : d;
}

// ─── createEvent ─────────────────────────────────────────────────────────────

export async function createEvent(
  formData: FormData
): Promise<{ success: true; eventId: string } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const store = await getVendorStore(session.userId);
  if (!store) return { error: "No store found. Complete onboarding first." };

  const title = str(formData, "title");
  const category = str(formData, "category");
  const startDateStr = str(formData, "startDate");
  const startTimeStr = str(formData, "startTime");

  if (!title) return { error: "Title is required." };
  if (!category) return { error: "Category is required." };
  if (!startDateStr) return { error: "Start date is required." };
  if (!startTimeStr) return { error: "Start time is required." };

  const startDate = combineDateAndTime(startDateStr, startTimeStr);
  if (!startDate) return { error: "Invalid start date/time." };

  const endDateStr = str(formData, "endDate");
  const endTimeStr = str(formData, "endTime");
  const endDate = endDateStr ? combineDateAndTime(endDateStr, endTimeStr) : null;

  const baseSlug = sanitizeSlug(title);
  const slug = await uniqueEventSlug(baseSlug);

  try {
    const event = await prisma.event.create({
      data: {
        storeId: store.id,
        title,
        slug,
        category,
        description: str(formData, "description") || null,
        organiserName: str(formData, "organiserName") || null,
        startDate,
        endDate,
        eventType: str(formData, "eventType") || "SINGLE",
        isOnline: formData.get("isOnline") === "true",
        venueName: str(formData, "venueName") || null,
        address: str(formData, "address") || null,
        region: str(formData, "region") || null,
        streamUrl: str(formData, "streamUrl") || null,
        capacity: optInt(formData, "capacity"),
        dressCode: str(formData, "dressCode") || null,
        ageRestriction: str(formData, "ageRestriction") || null,
        coverImage: str(formData, "coverImage") || null,
        galleryImages: [],
        refundPolicy: str(formData, "refundPolicy") || null,
        refundPolicyType: (str(formData, "refundPolicyType") as "FULL" | "PARTIAL" | "NONE") || "FULL",
        refundCutoffHours: optInt(formData, "refundCutoffHours") ?? 48,
        registrationRequired: formData.get("registrationRequired") === "true",
        registrationDeadline: optDate(formData, "registrationDeadline"),
        hasSeating: formData.get("hasSeating") === "true",
        lineup: (() => {
          const raw = formData.get("lineup");
          if (!raw) return undefined;
          try { return JSON.parse(raw as string); } catch { return undefined; }
        })(),
        status: "DRAFT",
        isPublished: false,
        tags: [],
      },
      select: { id: true },
    });

    revalidatePath(EVENTS_PATH);
    return { success: true, eventId: event.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create event." };
  }
}

// ─── updateEvent ─────────────────────────────────────────────────────────────

export async function updateEvent(
  eventId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const event = await assertEventOwnership(eventId, session.userId);
  if (!event) return { error: "Event not found." };

  const startDateStr = str(formData, "startDate");
  const startTimeStr = str(formData, "startTime");
  const endDateStr = str(formData, "endDate");
  const endTimeStr = str(formData, "endTime");

  const startDate = startDateStr ? combineDateAndTime(startDateStr, startTimeStr) : undefined;
  const endDate = endDateStr ? combineDateAndTime(endDateStr, endTimeStr) : null;

  // galleryImages arrives as a JSON array string or comma-separated
  let galleryImages: string[] | undefined;
  const galleryRaw = str(formData, "galleryImages");
  if (galleryRaw) {
    try {
      galleryImages = JSON.parse(galleryRaw) as string[];
    } catch {
      galleryImages = galleryRaw.split(",").map((u) => u.trim()).filter(Boolean);
    }
  }

  try {
    await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(str(formData, "title") ? { title: str(formData, "title") } : {}),
        ...(str(formData, "category") ? { category: str(formData, "category") } : {}),
        ...(str(formData, "description") !== "" ? { description: str(formData, "description") || null } : {}),
        ...(str(formData, "organiserName") !== "" ? { organiserName: str(formData, "organiserName") || null } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(str(formData, "eventType") ? { eventType: str(formData, "eventType") } : {}),
        ...(formData.has("isOnline") ? { isOnline: formData.get("isOnline") === "true" } : {}),
        ...(str(formData, "venueName") !== "" ? { venueName: str(formData, "venueName") || null } : {}),
        ...(str(formData, "address") !== "" ? { address: str(formData, "address") || null } : {}),
        ...(str(formData, "region") !== "" ? { region: str(formData, "region") || null } : {}),
        ...(str(formData, "streamUrl") !== "" ? { streamUrl: str(formData, "streamUrl") || null } : {}),
        ...(formData.has("capacity") ? { capacity: optInt(formData, "capacity") } : {}),
        ...(str(formData, "dressCode") !== "" ? { dressCode: str(formData, "dressCode") || null } : {}),
        ...(str(formData, "ageRestriction") !== "" ? { ageRestriction: str(formData, "ageRestriction") || null } : {}),
        ...(str(formData, "coverImage") !== "" ? { coverImage: str(formData, "coverImage") || null } : {}),
        ...(galleryImages !== undefined ? { galleryImages } : {}),
        ...(str(formData, "refundPolicyType") ? { refundPolicyType: str(formData, "refundPolicyType") as "FULL" | "PARTIAL" | "NONE" } : {}),
        ...(formData.has("refundCutoffHours") ? { refundCutoffHours: optInt(formData, "refundCutoffHours") ?? 48 } : {}),
        ...(formData.has("registrationRequired") ? { registrationRequired: formData.get("registrationRequired") === "true" } : {}),
        ...(formData.has("registrationDeadline") ? { registrationDeadline: optDate(formData, "registrationDeadline") } : {}),
        ...(formData.has("hasSeating") ? { hasSeating: formData.get("hasSeating") === "true" } : {}),
        ...(str(formData, "metaTitle") !== "" ? { metaTitle: str(formData, "metaTitle") || null } : {}),
        ...(str(formData, "metaDescription") !== "" ? { metaDescription: str(formData, "metaDescription") || null } : {}),
        ...(formData.has("lineup") ? {
          lineup: (() => {
            const raw = formData.get("lineup");
            if (!raw) return undefined;
            try { return JSON.parse(raw as string); } catch { return undefined; }
          })()
        } : {}),
      },
    });

    revalidatePath(EVENTS_PATH);
    revalidatePath(`${EVENTS_PATH}/${eventId}/edit`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update event." };
  }
}

// ─── publishEvent ─────────────────────────────────────────────────────────────

export async function publishEvent(
  eventId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const event = await prisma.event.findFirst({
    where: { id: eventId, store: { ownerId: session.userId } },
    select: {
      id: true,
      slug: true,
      title: true,
      startDate: true,
      coverImage: true,
      ticketTypes: {
        where: { isVisible: true },
        select: { id: true },
      },
    },
  });

  if (!event) return { error: "Event not found." };
  if (!event.title) return { error: "Event title is required before publishing." };
  if (!event.startDate) return { error: "Start date is required before publishing." };
  if (!event.coverImage) return { error: "Cover image is required before publishing." };
  if (event.ticketTypes.length === 0) {
    return { error: "At least one visible ticket type is required before publishing." };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED", isPublished: true },
  });

  revalidatePath(EVENTS_PATH);
  revalidatePath(`${EVENTS_PATH}/${eventId}/tickets`);
  revalidatePath(`/events/${event.slug}`);
  return { success: true };
}

// ─── deleteEvent ──────────────────────────────────────────────────────────────

export async function deleteEvent(
  eventId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const event = await prisma.event.findFirst({
    where: { id: eventId, store: { ownerId: session.userId } },
    select: {
      id: true,
      slug: true,
      ticketTypes: { select: { quantitySold: true } },
      tickets: { select: { id: true }, take: 1 },
      ticketOrders: { select: { id: true }, take: 1 },
    },
  });

  if (!event) return { error: "Event not found." };

  const hasTicketHistory =
    event.ticketTypes.some((t) => t.quantitySold > 0) ||
    event.tickets.length > 0 ||
    event.ticketOrders.length > 0;

  try {
    if (hasTicketHistory) {
      await prisma.event.update({
        where: { id: eventId },
        data: { status: "CANCELLED", isPublished: false },
      });
    } else {
      await prisma.$transaction([
        prisma.eventPromoCode.deleteMany({ where: { eventId } }),
        prisma.eventWaitlist.deleteMany({ where: { eventId } }),
        prisma.eventTicketType.deleteMany({ where: { eventId } }),
        prisma.event.delete({ where: { id: eventId } }),
      ]);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete event.",
    };
  }

  revalidatePath(EVENTS_PATH);
  revalidatePath(`/events/${event.slug}`);
  return { success: true };
}

// ─── getVendorEvents ──────────────────────────────────────────────────────────

/** Session-based version — call from client components without passing storeId. */
export async function getVendorEventsForCurrentUser() {
  const session = await getSession();
  if (!session) return [];
  const store = await getVendorStore(session.userId);
  if (!store) return [];
  return getVendorEvents(store.id);
}

export async function getVendorEvents(storeId: string) {
  const events = await prisma.event.findMany({
    where: { storeId },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      startDate: true,
      endDate: true,
      coverImage: true,
      status: true,
      isPublished: true,
      region: true,
      isOnline: true,
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          quantitySold: true,
          isVisible: true,
        },
      },
      _count: { select: { tickets: true } },
    },
  });

  const soldByEvent = await getPaidTicketSoldCountsForEvents(events.map((e) => e.id));

  return events.map((event) => {
    const sold = soldByEvent[event.id];
    return {
      ...event,
      ticketTypes: event.ticketTypes.map((tt) => ({
        ...tt,
        quantitySold: sold?.byTicketTypeId[tt.id] ?? 0,
      })),
    };
  });
}

// ─── createTicketType ─────────────────────────────────────────────────────────

export async function createTicketType(
  eventId: string,
  formData: FormData
): Promise<{ success: true; ticketTypeId: string } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const event = await assertEventOwnership(eventId, session.userId);
  if (!event) return { error: "Event not found." };

  const name = str(formData, "name");
  const priceRaw = str(formData, "price");
  const quantityRaw = str(formData, "quantity");

  if (!name) return { error: "Ticket type name is required." };
  if (!priceRaw) return { error: "Price is required." };
  if (!quantityRaw) return { error: "Quantity is required." };

  const price = parseFloat(priceRaw);
  const quantity = parseInt(quantityRaw, 10);

  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!Number.isFinite(quantity) || quantity < 1) return { error: "Enter a valid quantity." };

  const saleStartDate = optDate(formData, "saleStartDate");
  const saleEnds = optDate(formData, "saleEnds");
  const maxPerOrder = optInt(formData, "maxPerOrder") ?? 10;
  const isVisible = formData.get("isVisible") !== "false";
  const color = str(formData, "color") || null;
  const description = str(formData, "description") || null;
  const perks = str(formData, "perks") || null;

  try {
    const ticketType = await prisma.eventTicketType.create({
      data: {
        eventId,
        name,
        price,
        quantity,
        description,
        perks,
        saleStartDate,
        saleEnds,
        maxPerOrder,
        isVisible,
        color,
        quantitySold: 0,
      },
      select: { id: true },
    });

    revalidatePath(`${EVENTS_PATH}/${eventId}/tickets`);
    return { success: true, ticketTypeId: ticketType.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create ticket type." };
  }
}

// ─── updateTicketType ─────────────────────────────────────────────────────────

export async function updateTicketType(
  ticketTypeId: string,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const ticketType = await prisma.eventTicketType.findFirst({
    where: { id: ticketTypeId, event: { store: { ownerId: session.userId } } },
    select: { id: true, eventId: true },
  });
  if (!ticketType) return { error: "Ticket type not found." };

  const name = str(formData, "name");
  const priceRaw = str(formData, "price");
  const quantityRaw = str(formData, "quantity");

  const updates: Record<string, unknown> = {};

  if (name) updates.name = name;
  if (priceRaw) {
    const price = parseFloat(priceRaw);
    if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
    updates.price = price;
  }
  if (quantityRaw) {
    const quantity = parseInt(quantityRaw, 10);
    if (!Number.isFinite(quantity) || quantity < 1) return { error: "Enter a valid quantity." };
    updates.quantity = quantity;
  }
  if (str(formData, "description") !== "") updates.description = str(formData, "description") || null;
  if (str(formData, "perks") !== "") updates.perks = str(formData, "perks") || null;

  const saleStartDate = optDate(formData, "saleStartDate");
  if (saleStartDate !== null) updates.saleStartDate = saleStartDate;
  const saleEnds = optDate(formData, "saleEnds");
  if (saleEnds !== null) updates.saleEnds = saleEnds;

  if (formData.has("maxPerOrder")) {
    updates.maxPerOrder = optInt(formData, "maxPerOrder") ?? 10;
  }
  if (formData.has("isVisible")) {
    updates.isVisible = formData.get("isVisible") !== "false";
  }
  if (str(formData, "color") !== "") updates.color = str(formData, "color") || null;

  try {
    await prisma.eventTicketType.update({ where: { id: ticketTypeId }, data: updates });
    revalidatePath(`${EVENTS_PATH}/${ticketType.eventId}/tickets`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update ticket type." };
  }
}

// ─── deleteTicketType ─────────────────────────────────────────────────────────

export async function deleteTicketType(
  ticketTypeId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const ticketType = await prisma.eventTicketType.findFirst({
    where: { id: ticketTypeId, event: { store: { ownerId: session.userId } } },
    select: { id: true, quantitySold: true, eventId: true },
  });
  if (!ticketType) return { error: "Ticket type not found." };
  if (ticketType.quantitySold > 0) {
    return { error: "Cannot delete a ticket type that already has tickets sold." };
  }

  await prisma.eventTicketType.delete({ where: { id: ticketTypeId } });
  revalidatePath(`${EVENTS_PATH}/${ticketType.eventId}/tickets`);
  return { success: true };
}

// ─── generateEventScanCode ───────────────────────────────────────────────────

export async function generateEventScanCode(
  eventId: string,
): Promise<{ ok: boolean; code?: string; reason?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const trimmedId = eventId?.trim();
  if (!trimmedId) return { ok: false, reason: "Event not found" };

  if (session.role === "ADMIN") {
    const exists = await prisma.event.findUnique({
      where: { id: trimmedId },
      select: { id: true },
    });
    if (!exists) return { ok: false, reason: "Event not found" };
  } else {
    const event = await assertEventOwnership(trimmedId, session.userId);
    if (!event) return { ok: false, reason: "Unauthorized" };
  }

  const code = generateEventScanCodeValue();

  await prisma.event.update({
    where: { id: trimmedId },
    data: { scanCode: code, scanCodeSetAt: new Date() },
  });

  revalidatePath(`${EVENTS_PATH}/${trimmedId}/checkin`);
  revalidatePath(`${EVENTS_PATH}/${trimmedId}/tickets`);
  revalidatePath(`${EVENTS_PATH}/${trimmedId}/attendees`);

  return { ok: true, code };
}

// ─── unpublishEvent ───────────────────────────────────────────────────────────

export async function unpublishEvent(
  eventId: string
): Promise<{ success: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const event = await assertEventOwnership(eventId, session.userId);
  if (!event) return { error: "Event not found." };

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "DRAFT", isPublished: false },
  });

  revalidatePath(EVENTS_PATH);
  revalidatePath(`/events/${event.slug}`);
  return { success: true };
}

// ─── bulkUpdateEventStatus ───────────────────────────────────────────────────

export async function bulkUpdateEventStatus(
  eventIds: string[],
  action: "publish" | "unpublish" | "delete"
): Promise<{ success: true; count: number; errors: string[] } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };
  if (!eventIds.length) return { error: "No events selected." };

  // Verify ownership of all events before taking any action
  const ownedEvents = await prisma.event.findMany({
    where: { id: { in: eventIds }, store: { ownerId: session.userId } },
    select: { id: true, ticketTypes: { select: { quantitySold: true } } },
  });

  if (ownedEvents.length !== eventIds.length) {
    return { error: "One or more events not found or not owned by you." };
  }

  const errors: string[] = [];
  let count = 0;

  for (const event of ownedEvents) {
    try {
      if (action === "publish") {
        await prisma.event.update({
          where: { id: event.id },
          data: { status: "PUBLISHED", isPublished: true },
        });
        count++;
      } else if (action === "unpublish") {
        await prisma.event.update({
          where: { id: event.id },
          data: { status: "DRAFT", isPublished: false },
        });
        count++;
      } else if (action === "delete") {
        const hasSales = event.ticketTypes.some((t) => t.quantitySold > 0);
        if (hasSales) {
          await prisma.event.update({
            where: { id: event.id },
            data: { status: "CANCELLED" },
          });
        } else {
          await prisma.event.delete({ where: { id: event.id } });
        }
        count++;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Failed on event ${event.id}`);
    }
  }

  revalidatePath(EVENTS_PATH);
  return { success: true, count, errors };
}

// ─── uploadEventCoverImage ────────────────────────────────────────────────────

export async function uploadEventCoverImage(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) return { error: "Only JPG, PNG, and WebP images are allowed." };
  if (file.size > 12 * 1024 * 1024) return { error: "Image must be 12 MB or smaller." };

  try {
    const url = await uploadFile(file, "events");
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

// ─── uploadEventGalleryImage ──────────────────────────────────────────────────

export async function uploadEventGalleryImage(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) return { error: "Only JPG, PNG, and WebP images are allowed." };
  if (file.size > 12 * 1024 * 1024) return { error: "Image must be 12 MB or smaller." };

  try {
    const url = await uploadFile(file, "events");
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

// ─── uploadLineupImage ────────────────────────────────────────────────────────

export async function uploadLineupImage(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "VENDOR") return { error: "Unauthorized" };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "No file provided." };

  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) return { error: "Only JPG, PNG, and WebP images are allowed." };
  if (file.size > 8 * 1024 * 1024) return { error: "Image must be 8 MB or smaller." };

  try {
    const url = await uploadFile(file, "events/lineup");
    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}
