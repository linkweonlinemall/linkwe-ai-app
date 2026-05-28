"use server";

import { NotificationType } from "@prisma/client";

import { createNotification } from "@/app/actions/notifications";
import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { bookingConfirmedCustomerEmail, newBookingVendorEmail } from "@/lib/email/templates";
import { prisma } from "@/lib/prisma";

export async function sendBookingConfirmationEmails(
  bookingId: string,
  customerUserId: string,
) {
  const bookingForEmail = await prisma.productBooking.findUnique({
    where: { id: bookingId },
    select: {
      bookingDate: true,
      startTime: true,
      customerId: true,
      product: {
        select: {
          name: true,
          store: {
            select: {
              name: true,
              ownerId: true,
              owner: { select: { email: true, fullName: true } },
            },
          },
        },
      },
    },
  });

  if (!bookingForEmail) return;

  const customerUser = await prisma.user.findUnique({
    where: { id: bookingForEmail.customerId },
    select: { email: true, fullName: true },
  });
  if (!customerUser) return;

  const dateStr = new Date(bookingForEmail.bookingDate).toLocaleDateString("en-TT", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const timeStr = (() => {
    const [h, m] = bookingForEmail.startTime.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  })();

  await sendEmail({
    to: customerUser.email,
    ...bookingConfirmedCustomerEmail({
      customerName: customerUser.fullName ?? "Customer",
      serviceName: bookingForEmail.product.name,
      storeName: bookingForEmail.product.store.name,
      bookingDate: dateStr,
      startTime: timeStr,
      orderUrl: `${BASE_URL}/bookings`,
    }),
  });

  await sendEmail({
    to: bookingForEmail.product.store.owner.email,
    ...newBookingVendorEmail({
      vendorName: bookingForEmail.product.store.owner.fullName ?? "Vendor",
      serviceName: bookingForEmail.product.name,
      customerName: customerUser.fullName ?? "Customer",
      bookingDate: dateStr,
      startTime: timeStr,
      dashboardUrl: `${BASE_URL}/dashboard/vendor/bookings`,
    }),
  });

  await createNotification({
    userId: customerUserId,
    type: NotificationType.BOOKING_CONFIRMED,
    title: `Booking confirmed — ${bookingForEmail.product.name}`,
    body: new Date(bookingForEmail.bookingDate).toLocaleDateString("en-TT", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    linkUrl: `/bookings`,
  });

  const vendorOwnerId = bookingForEmail.product.store.ownerId;
  if (vendorOwnerId) {
    await createNotification({
      userId: vendorOwnerId,
      type: NotificationType.BOOKING_CONFIRMED,
      title: `New booking — ${bookingForEmail.product.name}`,
      body: `From ${customerUser.fullName ?? "a customer"}`,
      linkUrl: `/dashboard/vendor/bookings`,
    });
  }
}
