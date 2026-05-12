"use server";

import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  CancelledBy,
  type Prisma,
} from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  generateSlotsForDate,
  getAvailableDates,
  utcMidnightFromYmd,
} from "@/lib/booking/slots";

function utcAnchorFromYmd(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

// Get service booking data for customer
export async function getServiceBookingData(serviceSlug: string) {
  const service = await prisma.product.findUnique({
    where: { slug: serviceSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      serviceDuration: true,
      requiresDeposit: true,
      depositAmount: true,
      requiresApproval: true,
      bookingPaymentMode: true,
      advanceBookingDays: true,
      cancellationHours: true,
      serviceLocation: true,
      isPublished: true,
      isService: true,
      store: {
        select: { name: true, slug: true, logoUrl: true, region: true },
      },
      availabilitySchedule: true,
      availabilityOverrides: {
        where: { date: { gte: new Date() } },
      },
      bookingSlots: {
        where: {
          date: { gte: new Date() },
          isAvailable: true,
        },
      },
    },
  });

  if (!service?.isPublished || !service?.isService) return null;

  const availableDates = getAvailableDates(
    service.availabilitySchedule,
    service.availabilityOverrides,
    service.advanceBookingDays ?? 30,
  );

  return { service, availableDates };
}

// Get slots for a specific date
export async function getSlotsForDate(serviceId: string, dateStr: string) {
  const dayStart = utcMidnightFromYmd(dateStr);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const service = await prisma.product.findUnique({
    where: { id: serviceId },
    select: {
      serviceDuration: true,
      availabilitySchedule: true,
      availabilityOverrides: {
        where: { date: { gte: new Date() } },
      },
      bookingSlots: {
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      },
    },
  });

  if (!service) return [];

  const anchor = utcAnchorFromYmd(dateStr);
  const dow = anchor.getUTCDay();
  const daySchedule = service.availabilitySchedule.find(
    (s) => s.dayOfWeek === dow && s.isActive,
  );
  const slotMinutes =
    daySchedule?.slotDurationMins ?? service.serviceDuration ?? 60;

  return generateSlotsForDate(
    dateStr,
    service.availabilitySchedule,
    service.availabilityOverrides,
    service.bookingSlots,
    slotMinutes,
  );
}

// Create a booking
export async function createBooking(input: {
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  customerNotes?: string;
  guestCount?: number;
  paymentMethod: "online" | "arrival";
}) {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const bookingDate = utcMidnightFromYmd(input.date);
  const dayStart = bookingDate;
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const service = await prisma.product.findUnique({
    where: { id: input.serviceId },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      depositAmount: true,
      requiresDeposit: true,
      requiresApproval: true,
      bookingPaymentMode: true,
      serviceDuration: true,
      availabilitySchedule: true,
      availabilityOverrides: { where: { date: { gte: new Date() } } },
      bookingSlots: {
        where: {
          date: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      },
    },
  });

  if (!service) return { error: "Service not found" };

  const dow = utcAnchorFromYmd(input.date).getUTCDay();
  const daySchedule = service.availabilitySchedule.find(
    (s) => s.dayOfWeek === dow && s.isActive,
  );
  const slotMinutes =
    daySchedule?.slotDurationMins ?? service.serviceDuration ?? 60;

  const slots = generateSlotsForDate(
    input.date,
    service.availabilitySchedule,
    service.availabilityOverrides,
    service.bookingSlots,
    slotMinutes,
  );

  const requestedSlot = slots.find(
    (s) => s.startTime === input.startTime && s.available,
  );
  if (!requestedSlot) return { error: "slot_unavailable" };

  const totalPrice = service.price;

  let slot = await prisma.productBookingSlot.findUnique({
    where: {
      productId_date_startTime: {
        productId: input.serviceId,
        date: bookingDate,
        startTime: input.startTime,
      },
    },
  });

  if (!slot) {
    slot = await prisma.productBookingSlot.create({
      data: {
        productId: input.serviceId,
        date: bookingDate,
        startTime: input.startTime,
        endTime: input.endTime,
        maxBookings: 1,
        currentBookings: 0,
        isAvailable: true,
      },
    });
  } else if (!slot.isAvailable || slot.currentBookings >= slot.maxBookings) {
    return { error: "slot_unavailable" };
  }

  const booking = await prisma.productBooking.create({
    data: {
      productId: input.serviceId,
      slotId: slot.id,
      customerId: session.userId,
      bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      guestCount: input.guestCount ?? 1,
      totalPrice,
      status: service.requiresApproval
        ? BookingStatus.PENDING
        : BookingStatus.CONFIRMED,
      customerNotes: input.customerNotes ?? null,
    },
  });

  const nextCount = slot.currentBookings + 1;

  await prisma.productBookingSlot.update({
    where: { id: slot.id },
    data: {
      currentBookings: nextCount,
      isAvailable: nextCount < slot.maxBookings,
    },
  });

  revalidatePath(`/service/${service.slug}`);

  return {
    ok: true,
    bookingId: booking.id,
    status: booking.status,
    requiresPayment: input.paymentMethod === "online",
    totalPrice,
    depositAmount: service.requiresDeposit ? service.depositAmount : null,
  };
}

// Get customer's bookings
export async function getCustomerBookings() {
  const session = await getSession();
  if (!session) return [];

  return prisma.productBooking.findMany({
    where: { customerId: session.userId },
    select: {
      id: true,
      bookingDate: true,
      startTime: true,
      endTime: true,
      status: true,
      totalPrice: true,
      guestCount: true,
      customerNotes: true,
      product: {
        select: {
          name: true,
          slug: true,
          images: true,
          store: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { bookingDate: "desc" },
  });
}

const vendorBookingServiceWhere = (
  storeId: string,
): Prisma.ProductWhereInput => ({
  storeId,
  isService: true,
});

// Get all bookings for a vendor across all their services
export async function getVendorBookings(
  filter?: "upcoming" | "pending" | "past" | "all",
) {
  const session = await getSession();
  if (!session) return [];

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return [];

  const now = new Date();

  const whereClause: Prisma.ProductBookingWhereInput = {
    product: vendorBookingServiceWhere(store.id),
  };

  if (filter === "pending") {
    whereClause.status = BookingStatus.PENDING;
  } else if (filter === "upcoming") {
    whereClause.bookingDate = { gte: now };
    whereClause.status = BookingStatus.CONFIRMED;
  } else if (filter === "past") {
    whereClause.bookingDate = { lt: now };
  }

  const bookings = await prisma.productBooking.findMany({
    where: whereClause,
    select: {
      id: true,
      bookingDate: true,
      startTime: true,
      endTime: true,
      status: true,
      totalPrice: true,
      guestCount: true,
      customerNotes: true,
      vendorNotes: true,
      createdAt: true,
      customerId: true,
      product: {
        select: {
          name: true,
          slug: true,
          serviceDuration: true,
        },
      },
      slot: {
        select: {
          id: true,
          date: true,
          startTime: true,
        },
      },
    },
    orderBy: { bookingDate: "asc" },
  });

  const customerIds = [...new Set(bookings.map((b) => b.customerId))];
  const customers =
    customerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: customerIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        })
      : [];
  const customerById = new Map(customers.map((u) => [u.id, u]));

  return bookings.map((b) => ({
    ...b,
    customer: customerById.get(b.customerId) ?? null,
  }));
}

// Update booking status (vendor action)
export async function updateBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW",
  vendorNotes?: string,
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  const booking = await prisma.productBooking.findFirst({
    where: {
      id: bookingId,
      product: vendorBookingServiceWhere(store.id),
    },
  });
  if (!booking) return { error: "Booking not found" };

  const nextStatus =
    status === "CONFIRMED"
      ? BookingStatus.CONFIRMED
      : status === "CANCELLED"
        ? BookingStatus.CANCELLED
        : status === "COMPLETED"
          ? BookingStatus.COMPLETED
          : BookingStatus.NO_SHOW;

  await prisma.productBooking.update({
    where: { id: bookingId },
    data: {
      status: nextStatus,
      vendorNotes:
        vendorNotes !== undefined ? vendorNotes ?? null : booking.vendorNotes,
      ...(nextStatus === BookingStatus.CANCELLED
        ? {
            cancelledAt: new Date(),
            cancelledBy: CancelledBy.VENDOR,
            cancellationReason: vendorNotes ?? null,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard/vendor/bookings");
  return { ok: true as const };
}

// Get booking counts for vendor dashboard stats
export async function getVendorBookingStats() {
  const session = await getSession();
  if (!session) return { pending: 0, upcoming: 0, completed: 0, total: 0 };

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { pending: 0, upcoming: 0, completed: 0, total: 0 };

  const now = new Date();

  const productScope: Prisma.ProductBookingWhereInput = {
    product: vendorBookingServiceWhere(store.id),
  };

  const [pending, upcoming, completed, total] = await Promise.all([
    prisma.productBooking.count({
      where: {
        ...productScope,
        status: BookingStatus.PENDING,
      },
    }),
    prisma.productBooking.count({
      where: {
        ...productScope,
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: now },
      },
    }),
    prisma.productBooking.count({
      where: {
        ...productScope,
        status: BookingStatus.COMPLETED,
      },
    }),
    prisma.productBooking.count({
      where: productScope,
    }),
  ]);

  return { pending, upcoming, completed, total };
}
