"use server";

import { revalidatePath } from "next/cache";
import {
  BookingStatus,
  CancelledBy,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createWiPayHostedPayment } from "@/lib/wipay/payments";
import { BASE_URL } from "@/lib/email/resend";
import { sendBookingConfirmationEmails } from "@/app/actions/booking-emails";
import { cancelBookingCore } from "@/lib/finance/cancel-booking";
import {
  getBookingScheduledEnd,
  getBookingScheduledStart,
} from "@/lib/finance/booking-schedule";
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
import { createNotification } from "@/lib/notifications/create";
import { releaseBookingPaymentHoldTx } from "@/lib/payments/release-booking-hold";
import {
  checkoutExpiresAt,
  expireCheckoutAttempt,
} from "@/lib/payments/checkout-expiry";

class SlotUnavailableError extends Error {}

function isRetryableBookingConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

async function releaseUnpaidBookingReservation(
  bookingId: string,
  customerId: string,
  reason: string,
) {
  await prisma.$transaction(
    async (tx) => {
      const owned = await tx.productBooking.findFirst({
        where: { id: bookingId, customerId },
        select: { id: true },
      });
      if (!owned) return;
      await releaseBookingPaymentHoldTx(tx, owned.id, reason);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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

  const guestCount = input.guestCount ?? 1;
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100) {
    return { error: "Enter a valid number of guests." };
  }
  const customerNotes = input.customerNotes?.trim() || null;
  if (customerNotes && customerNotes.length > 2_000) {
    return { error: "Booking notes must be 2,000 characters or fewer." };
  }

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
      isPublished: true,
      isArchived: true,
      isService: true,
      storeId: true,
      store: {
        select: {
          id: true,
          openingHours: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          status: true,
          owner: { select: { id: true, idVerificationStatus: true } },
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

  if (
    !service ||
    !service.isPublished ||
    service.isArchived ||
    !service.isService
  ) {
    return { error: "Service not found" };
  }

  if (!isStoreSellable(service.store)) return { error: "Service not found" };
  if (service.store.owner.id === session.userId) {
    return { error: "You cannot book your own service." };
  }

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

  const totalPrice = service.price;
  if (!Number.isFinite(totalPrice) || totalPrice < 0) {
    return { error: "This service does not have a valid price." };
  }

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
  const needsPayment = chargeAmount != null && chargeAmount > 0;
  const initialStatus = service.requiresApproval
    ? BookingStatus.PENDING
    : needsPayment
      ? BookingStatus.PENDING
      : BookingStatus.CONFIRMED;
  const paymentType = input.paymentMethod === "online" ? "full" : "deposit";
  const paymentAttemptExpiresAt = needsPayment ? checkoutExpiresAt() : null;

  let booking: Awaited<ReturnType<typeof prisma.productBooking.create>> | null = null;

  for (let attempt = 0; attempt < 3 && !booking; attempt++) {
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          const liveBookingSlots = await tx.productBookingSlot.findMany({
            where: {
              productId: input.serviceId,
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
          });
          const liveChosen = getAvailableSlots(
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
            liveBookingSlots,
          ).find((candidate) => candidate.time === input.startTime && candidate.available);

          if (!liveChosen) throw new SlotUnavailableError();

          let slot = await tx.productBookingSlot.findFirst({
            where: {
              productId: input.serviceId,
              startTime: input.startTime,
              date: { gte: dayStart, lte: dayEnd },
            },
          });

          if (!slot) {
            slot = await tx.productBookingSlot.create({
              data: {
                productId: input.serviceId,
                date: bookingDate,
                startTime: input.startTime,
                endTime: liveChosen.endTime,
                maxBookings: 1,
                currentBookings: 0,
                isAvailable: true,
              },
            });
          }

          if (!slot.isAvailable || slot.currentBookings >= slot.maxBookings) {
            throw new SlotUnavailableError();
          }

          const created = await tx.productBooking.create({
            data: {
              productId: input.serviceId,
              slotId: slot.id,
              customerId: session.userId,
              bookingDate,
              startTime: input.startTime,
              endTime: liveChosen.endTime,
              guestCount,
              totalPrice,
              status: initialStatus,
              customerNotes,
            },
          });

          if (needsPayment && chargeAmount != null && paymentAttemptExpiresAt) {
            await tx.paymentAttempt.create({
              data: {
                purpose: "PRODUCT_BOOKING",
                merchantOrderId: `booking-${created.id}-${paymentType}`,
                activeKey: `PRODUCT_BOOKING:${created.id}`,
                amountMinor: Math.round(chargeAmount * 100),
                userId: session.userId,
                targetId: created.id,
                providerData: { paymentType },
                expiresAt: paymentAttemptExpiresAt,
              },
            });
          }

          const nextCount = slot.currentBookings + 1;
          await tx.productBookingSlot.update({
            where: { id: slot.id },
            data: {
              currentBookings: nextCount,
              isAvailable: nextCount < slot.maxBookings,
            },
          });

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        return { error: "slot_unavailable" };
      }
      if (isRetryableBookingConflict(error) && attempt < 2) continue;
      if (isRetryableBookingConflict(error)) return { error: "slot_unavailable" };
      throw error;
    }
  }

  if (!booking) return { error: "slot_unavailable" };

  if (initialStatus === BookingStatus.CONFIRMED) {
    await sendBookingConfirmationEmails(booking.id, session.userId);
  } else if (!needsPayment) {
    await createNotification({
      userId: service.store.owner.id,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `New booking request — ${service.name}`,
      body: "A customer is waiting for your approval.",
      linkUrl: "/dashboard/vendor/bookings",
    });
  }

  revalidatePath(`/service/${service.slug}`);

  return {
    ok: true,
    bookingId: booking.id,
    status: booking.status,
    requiresPayment: needsPayment,
    chargeAmount: needsPayment ? chargeAmount : null,
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
  if (amountMinor < 1) {
    await releaseUnpaidBookingReservation(
      bookingId,
      session.userId,
      "The payment amount was invalid.",
    );
    return { error: "Invalid payment amount" };
  }

  const merchantOrderId = `booking-${bookingId}-${paymentType}`;
  const activeKey = `PRODUCT_BOOKING:${bookingId}`;
  const existingActiveAttempt = await prisma.paymentAttempt.findUnique({
    where: { activeKey },
    select: { merchantOrderId: true },
  });
  if (
    existingActiveAttempt &&
    existingActiveAttempt.merchantOrderId !== merchantOrderId
  ) {
    return { error: "A payment checkout is already active for this booking." };
  }

  try {
    const attempt = await prisma.paymentAttempt.upsert({
      where: { merchantOrderId },
      create: {
        purpose: "PRODUCT_BOOKING",
        merchantOrderId,
        activeKey,
        amountMinor,
        userId: session.userId,
        targetId: bookingId,
        providerData: { paymentType },
        expiresAt: checkoutExpiresAt(),
      },
      update: {
        amountMinor,
        activeKey,
        failureMessage: null,
      },
    });
    if (attempt.status === "PENDING" && attempt.expiresAt && attempt.expiresAt <= new Date()) {
      await expireCheckoutAttempt(attempt.id);
      return { error: "This checkout expired. Please select the time again." };
    }
    if (attempt.status !== "PENDING") {
      await releaseUnpaidBookingReservation(
        bookingId,
        session.userId,
        "Checkout is no longer active.",
      );
      return { error: "This checkout expired. Please select the time again." };
    }
    const payment = await createWiPayHostedPayment({
      merchantOrderId,
      amountMinor,
      email: session.email,
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
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "A payment checkout is already active for this booking." };
    }
    try {
      await prisma.paymentAttempt.updateMany({
        where: { merchantOrderId, status: "PENDING" },
        data: {
          status: "ERROR",
          activeKey: null,
          failureMessage: "Hosted payment setup failed",
        },
      });
    } catch (attemptError) {
      console.error("[createBookingPaymentIntent:attempt]", attemptError);
    }
    try {
      await releaseUnpaidBookingReservation(
        bookingId,
        session.userId,
        "Payment could not be started.",
      );
    } catch (releaseError) {
      console.error("[createBookingPaymentIntent:release]", releaseError);
    }
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
    whereClause.status = {
      in: [BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID],
    };
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

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "upcoming") {
      return getBookingScheduledEnd(booking.bookingDate, booking.endTime) >= now;
    }
    if (filter === "past") {
      return (
        (
          [
            BookingStatus.CANCELLED,
            BookingStatus.COMPLETED,
            BookingStatus.NO_SHOW,
          ] as BookingStatus[]
        ).includes(booking.status) ||
        getBookingScheduledEnd(booking.bookingDate, booking.endTime) < now
      );
    }
    return true;
  });

  const customerIds = [...new Set(filteredBookings.map((b) => b.customerId))];
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

  return filteredBookings.map((b) => ({
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
    select: {
      id: true,
      customerId: true,
      status: true,
      cancelledAt: true,
      bookingDate: true,
      startTime: true,
      vendorNotes: true,
      product: { select: { name: true } },
    },
  });
  if (!booking) return { error: "Booking not found" };
  if (booking.cancelledAt) {
    return { error: "Booking cancellation is already in progress." };
  }

  const nextStatus =
    status === "CONFIRMED" ? BookingStatus.CONFIRMED : BookingStatus.NO_SHOW;

  if (booking.status === nextStatus) return { ok: true as const };

  const allowedCurrentStatuses: BookingStatus[] =
    nextStatus === BookingStatus.CONFIRMED
      ? [BookingStatus.PENDING, BookingStatus.DEPOSIT_PAID]
      : [BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID];

  if (!allowedCurrentStatuses.includes(booking.status)) {
    return { error: "Booking cannot be moved to that status." };
  }

  if (
    nextStatus === BookingStatus.NO_SHOW &&
    new Date() < getBookingScheduledStart(booking.bookingDate, booking.startTime)
  ) {
    return { error: "A booking cannot be marked no-show before its start time." };
  }

  const updated = await prisma.productBooking.updateMany({
    where: {
      id: bookingId,
      status: { in: allowedCurrentStatuses },
      cancelledAt: null,
    },
    data: {
      status: nextStatus,
      vendorNotes:
        vendorNotes !== undefined ? vendorNotes ?? null : booking.vendorNotes,
    },
  });

  if (updated.count !== 1) {
    return { error: "Booking changed while you were updating it. Please refresh." };
  }

  await createNotification({
    userId: booking.customerId,
    type: NotificationType.BOOKING_CONFIRMED,
    title:
      nextStatus === BookingStatus.CONFIRMED
        ? `Booking confirmed — ${booking.product.name}`
        : `Booking marked no-show — ${booking.product.name}`,
    body:
      nextStatus === BookingStatus.CONFIRMED
        ? "Your vendor confirmed the booking. Open it to review the details."
        : "The vendor marked this booking as a no-show. Contact them if this is incorrect.",
    linkUrl: "/bookings",
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
      customerId: true,
      status: true,
      product: {
        select: {
          name: true,
          store: { select: { ownerId: true } },
        },
      },
    },
  });

  if (!booking) return { error: "Booking not found" };
  if (booking.product.store.ownerId !== session.userId) {
    return { error: "Not authorized" };
  }
  if (
    (
      [
        BookingStatus.CANCELLED,
        BookingStatus.COMPLETED,
        BookingStatus.NO_SHOW,
      ] as BookingStatus[]
    ).includes(booking.status)
  ) {
    return { error: "Meeting details cannot be changed for a closed booking." };
  }

  const normalizedMeetingLink = meetingLink.trim();
  if (normalizedMeetingLink) {
    try {
      const parsed = new URL(normalizedMeetingLink);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { error: "Meeting link must start with https:// or http://" };
      }
    } catch {
      return { error: "Enter a valid meeting link, including https://" };
    }
  }

  await prisma.productBooking.update({
    where: { id: bookingId },
    data: { meetingLink: normalizedMeetingLink || null },
  });

  await createNotification({
    userId: booking.customerId,
    type: NotificationType.BOOKING_CONFIRMED,
    title: `Booking details updated — ${booking.product.name}`,
    body: normalizedMeetingLink
      ? "A meeting link was added or changed. Open your booking to view it."
      : "The meeting link was removed. Contact the vendor if you need assistance.",
    linkUrl: "/bookings",
  });

  revalidatePath("/dashboard/vendor/bookings");
  revalidatePath("/bookings");
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

  const [pending, upcomingCandidates, completed, total] = await Promise.all([
    prisma.productBooking.count({
      where: {
        ...productScope,
        status: BookingStatus.PENDING,
      },
    }),
    prisma.productBooking.findMany({
      where: {
        ...productScope,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID] },
      },
      select: { bookingDate: true, endTime: true },
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

  const upcoming = upcomingCandidates.filter(
    (booking) => getBookingScheduledEnd(booking.bookingDate, booking.endTime) >= now,
  ).length;

  return { pending, upcoming, completed, total };
}
