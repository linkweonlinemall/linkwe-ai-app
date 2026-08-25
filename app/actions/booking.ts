"use server";

import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  CancelledBy,
  type Prisma,
} from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";
import { BASE_URL } from "@/lib/email/resend";
import { sendBookingConfirmationEmails } from "@/app/actions/booking-emails";
import { cancelBookingCore } from "@/lib/finance/cancel-booking";
import {
  generateSlotsForDate,
  getAvailableDates,
  utcMidnightFromYmd,
} from "@/lib/booking/slots";
import { parseStoreOpeningHours } from "@/lib/services/opening-hours";
import { getAvailableSlots } from "@/lib/services/get-available-slots";
import { isStoreSellable } from "@/lib/store/sellable-store";
import {
  calendarDateAnchorTrinidad,
  dayRangeTrinidad,
  isSlotInPastTrinidad,
} from "@/lib/timezone/trinidad";
import { canVendorUsePayOnArrival } from "@/lib/services/payment-policy";

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

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const dow = date.getUTCDay();
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "slot_unavailable" };
  }

  if (isSlotInPastTrinidad(input.date, input.startTime)) {
    return { error: "slot_unavailable" };
  }

  const bookingDate = calendarDateAnchorTrinidad(input.date);
  const { start: dayStart, end: dayEnd } = dayRangeTrinidad(input.date);

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
      serviceType: true,
      serviceDuration: true,
      durationMinutes: true,
      bufferMinutes: true,
      maxPerDay: true,
      useStoreHours: true,
      availableDays: true,
      availableFrom: true,
      availableTo: true,
      isAvailable: true,
      storeId: true,
      store: {
        select: {
          id: true,
          openingHours: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          status: true,
          owner: { select: { idVerificationStatus: true } },
        },
      },
      bookingSlots: {
        where: {
          date: { gte: dayStart, lte: dayEnd },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
          currentBookings: true,
          maxBookings: true,
          isAvailable: true,
        },
      },
    },
  });

  if (!service) return { error: "Service not found" };

  if (!isStoreSellable(service.store)) return { error: "Service not found" };

  if (!service.isAvailable) return { error: "slot_unavailable" };

  if (
    service.serviceType === "VIRTUAL" ||
    !canVendorUsePayOnArrival(
      service.store.subscriptionPlan,
      service.store.subscriptionStatus,
    )
  ) {
    if (input.paymentMethod !== "online") {
      return {
        error:
          service.serviceType === "VIRTUAL"
            ? "Virtual services must be paid online."
            : "Starter-plan services must be paid online through LinkWe.",
      };
    }
  } else {
    if (
      service.bookingPaymentMode === "ONLINE_ONLY" &&
      input.paymentMethod !== "online"
    ) {
      return { error: "This service requires online payment." };
    }
    if (
      service.bookingPaymentMode === "ON_ARRIVAL_ONLY" &&
      input.paymentMethod !== "arrival"
    ) {
      return { error: "This service is pay-on-arrival only." };
    }
  }

  const openingHours = parseStoreOpeningHours(service.store.openingHours);
  const durationMinutes = service.durationMinutes || service.serviceDuration || 60;

  const slots = getAvailableSlots(
    {
      durationMinutes,
      bufferMinutes: service.bufferMinutes ?? 0,
      maxPerDay: service.maxPerDay,
      useStoreHours: service.useStoreHours,
      availableDays: service.availableDays,
      availableFrom: service.availableFrom,
      availableTo: service.availableTo,
      isAvailable: service.isAvailable,
    },
    input.date,
    openingHours,
    service.bookingSlots,
  );

  const chosen = slots.find((s) => s.time === input.startTime && s.available);
  if (!chosen) return { error: "slot_unavailable" };

  const endTime = chosen.endTime;

  const totalPrice = service.price;

  const depositDue =
    service.depositAmount != null && service.depositAmount > 0
      ? service.depositAmount
      : null;
  const chargeAmount =
    input.paymentMethod === "online"
      ? totalPrice
      : input.paymentMethod === "arrival" && depositDue != null
        ? depositDue
        : null;
  const needsPayment = chargeAmount != null;
  const initialStatus = service.requiresApproval
    ? BookingStatus.PENDING
    : needsPayment
      ? BookingStatus.PENDING
      : BookingStatus.CONFIRMED;

  let slot = await prisma.productBookingSlot.findFirst({
    where: {
      productId: input.serviceId,
      startTime: input.startTime,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  if (!slot) {
    slot = await prisma.productBookingSlot.create({
      data: {
        productId: input.serviceId,
        date: bookingDate,
        startTime: input.startTime,
        endTime,
        maxBookings: 1,
        currentBookings: 0,
        isAvailable: true,
      },
    });
  } else if (slot.currentBookings >= slot.maxBookings) {
    return { error: "slot_unavailable" };
  } else if (!slot.isAvailable || slot.date.getTime() !== bookingDate.getTime()) {
    // Recover capacity flags left stale by bookings cancelled before slot-release
    // handling updated both currentBookings and isAvailable atomically.
    slot = await prisma.productBookingSlot.update({
      where: { id: slot.id },
      data: {
        ...(!slot.isAvailable ? { isAvailable: true } : {}),
        ...(slot.date.getTime() !== bookingDate.getTime()
          ? { date: bookingDate, endTime }
          : {}),
      },
    });
  }

  const booking = await prisma.productBooking.create({
    data: {
      productId: input.serviceId,
      slotId: slot.id,
      customerId: session.userId,
      bookingDate,
      startTime: input.startTime,
      endTime,
      guestCount: input.guestCount ?? 1,
      totalPrice,
      status: initialStatus,
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

  if (initialStatus === BookingStatus.CONFIRMED) {
    await sendBookingConfirmationEmails(booking.id, session.userId);
  }

  revalidatePath(`/service/${service.slug}`);

  return {
    ok: true,
    bookingId: booking.id,
    status: booking.status,
    requiresPayment: chargeAmount != null,
    chargeAmount,
    totalPrice,
    depositAmount: depositDue,
  };
}

export async function createBookingPaymentIntent(
  bookingId: string,
  paymentType: "full" | "deposit",
): Promise<
  | { ok: true; checkoutUrl: string }
  | { error: string }
> {
  const session = await getSession();
  if (!session) return { error: "not_logged_in" };

  const booking = await prisma.productBooking.findFirst({
    where: { id: bookingId, customerId: session.userId },
    select: {
      id: true,
      status: true,
      totalPrice: true,
      product: {
        select: {
          depositAmount: true,
          store: {
            select: {
              status: true,
              owner: { select: { idVerificationStatus: true } },
            },
          },
        },
      },
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (!isStoreSellable(booking.product.store)) return { error: "Booking not found" };
  if (booking.status !== BookingStatus.PENDING) {
    return { error: "This booking is not awaiting payment" };
  }

  const depositDue =
    booking.product.depositAmount != null && booking.product.depositAmount > 0
      ? booking.product.depositAmount
      : null;

  const amountTtd =
    paymentType === "deposit" && depositDue != null
      ? depositDue
      : booking.totalPrice;

  const amountMinor = Math.round(amountTtd * 100);
  if (amountMinor < 1) return { error: "Invalid payment amount" };

  const merchantOrderId = `booking-${bookingId}-${paymentType}`;
  try {
    await prisma.paymentAttempt.upsert({
      where: { merchantOrderId },
      create: {
        purpose: "PRODUCT_BOOKING",
        merchantOrderId,
        amountMinor,
        userId: session.userId,
        targetId: bookingId,
        providerData: { paymentType },
      },
      update: { amountMinor, status: "PENDING", failureMessage: null },
    });
    const payment = await createWiPayHostedPayment({
      merchantOrderId,
      amountMinor,
      responseUrl: `${BASE_URL}/api/payments/wipay/return`,
      data: { purpose: "PRODUCT_BOOKING", targetId: bookingId, paymentType },
    });
    await prisma.paymentAttempt.update({
      where: { merchantOrderId },
      data: { providerTransactionId: payment.transactionId },
    });
    return { ok: true, checkoutUrl: payment.url };
  } catch (e) {
    console.error("[createBookingPaymentIntent]", e);
    return { error: "Payment setup failed. Please try again." };
  }
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
      amountPaid: true,
      guestCount: true,
      customerNotes: true,
      vendorNotes: true,
      meetingLink: true,
      createdAt: true,
      customerId: true,
      product: {
        select: {
          name: true,
          slug: true,
          serviceType: true,
          serviceDuration: true,
          requiresDeposit: true,
          depositAmount: true,
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

const VENDOR_SETTABLE_STATUSES = ["CONFIRMED", "CANCELLED", "NO_SHOW"] as const;
type VendorSettableStatus = (typeof VENDOR_SETTABLE_STATUSES)[number];

// Update booking status (vendor action)
export async function updateBookingStatus(
  bookingId: string,
  status: VendorSettableStatus,
  vendorNotes?: string,
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  // Runtime defense-in-depth: TS narrows the param type above, but a crafted
  // call to this server action (bypassing the client bundle) could still send
  // "COMPLETED" as a raw string. Completion must only ever happen via the
  // customer's markBookingComplete or the auto-complete cron, both of which
  // release earnings; a vendor-triggered COMPLETED write would orphan them.
  if (!VENDOR_SETTABLE_STATUSES.includes(status)) {
    return { error: "Only the customer can mark a service complete." };
  }

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) return { error: "No store found" };

  if (status === "CANCELLED") {
    const bookingExists = await prisma.productBooking.findFirst({
      where: { id: bookingId, product: vendorBookingServiceWhere(store.id) },
      select: { id: true },
    });
    if (!bookingExists) return { error: "Booking not found" };
    return cancelBookingCore(bookingId, CancelledBy.VENDOR, vendorNotes ?? null, vendorNotes);
  }

  const booking = await prisma.productBooking.findFirst({
    where: {
      id: bookingId,
      product: vendorBookingServiceWhere(store.id),
    },
  });
  if (!booking) return { error: "Booking not found" };

  const nextStatus =
    status === "CONFIRMED" ? BookingStatus.CONFIRMED : BookingStatus.NO_SHOW;

  await prisma.productBooking.update({
    where: { id: bookingId },
    data: {
      status: nextStatus,
      vendorNotes:
        vendorNotes !== undefined ? vendorNotes ?? null : booking.vendorNotes,
    },
  });

  revalidatePath("/dashboard/vendor/bookings");
  return { ok: true as const };
}

export async function updateBookingMeetingLink(
  bookingId: string,
  meetingLink: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const booking = await prisma.productBooking.findFirst({
    where: { id: bookingId },
    select: {
      id: true,
      product: {
        select: {
          store: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (booking.product.store.ownerId !== session.userId) {
    return { error: "Not authorized" };
  }

  await prisma.productBooking.update({
    where: { id: bookingId },
    data: { meetingLink: meetingLink.trim() || null },
  });

  revalidatePath("/dashboard/vendor/bookings");
  return { ok: true };
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
