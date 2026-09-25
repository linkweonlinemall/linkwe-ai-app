import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { DeskRecord } from "./service-desk";

const service = { id: true, name: true, slug: true, images: true } as const;
const customer = { fullName: true, email: true, phone: true } as const;
const iso = (date: Date | null) => date?.toISOString() ?? null;
function coupon(value: unknown) { if (value && typeof value === "object" && "code" in value && typeof value.code === "string") return value.code; return null; }

export async function getServiceDesk() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR") redirect("/dashboard");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true, name: true, isAvailableNow: true } });
  if (!store) redirect("/onboarding/business/step-3");
  const [bookings, requests, subscriptions] = await Promise.all([
    prisma.productBooking.findMany({ where: { product: { storeId: store.id, isService: true } }, select: {
      id: true, status: true, createdAt: true, customerId: true, bookingDate: true, startTime: true, endTime: true,
      guestCount: true, totalPrice: true, amountPaid: true, customerNotes: true, vendorNotes: true, meetingLink: true,
      cancellationReason: true, cancelledBy: true, cancelledAt: true, completedAt: true, autoCompleteAt: true, earningsReleased: true, couponSnapshot: true,
      staffMember: { select: { name: true } }, product: { select: { ...service, serviceLocation: true } },
    }, orderBy: { createdAt: "desc" } }),
    prisma.onDemandRequest.findMany({ where: { storeId: store.id }, select: {
      id: true, status: true, createdAt: true, customerId: true, customer: { select: customer }, service: { select: { ...service, travelFee: true } },
      requestType: true, description: true, photos: true, customerAddress: true, customerLat: true, customerLng: true,
      quotedPrice: true, amountPaid: true, vendorNotes: true, declineReason: true, estimatedArrival: true, respondedAt: true,
      completedAt: true, vendorCompletedAt: true, autoCompleteAt: true, earningsReleased: true, couponSnapshot: true,
    }, orderBy: { createdAt: "desc" } }),
    prisma.customerServiceSubscription.findMany({ where: { storeId: store.id }, select: {
      id: true, status: true, createdAt: true, customerId: true, customer: { select: customer }, product: { select: service },
      priceMinor: true, interval: true, currentPeriodEnd: true, nextChargeAt: true, lastChargeAt: true, cancelAtPeriodEnd: true,
      canceledAt: true, pausedAt: true, pauseEndsAt: true, trialEndsAt: true, sessionsIncluded: true, sessionsRemaining: true,
      cancellationNoticeDays: true, canPause: true, pauseMaxWeeks: true,
      sessionUsages: { select: { id: true, usedAt: true }, orderBy: { usedAt: "desc" }, take: 20 },
    }, orderBy: { createdAt: "desc" } }),
  ]);
  const customers = await prisma.user.findMany({ where: { id: { in: [...new Set(bookings.map(b => b.customerId))] } }, select: { id: true, ...customer } });
  const customerMap = new Map(customers.map(c => [c.id, c]));
  const records: DeskRecord[] = [
    ...bookings.map(({ product, staffMember, couponSnapshot, ...b }) => ({ ...b, kind: "booking" as const, service: product, customer: customerMap.get(b.customerId) ?? null, staffName: staffMember?.name ?? null, location: product.serviceLocation, coupon: coupon(couponSnapshot), createdAt: b.createdAt.toISOString(), bookingDate: b.bookingDate.toISOString(), cancelledAt: iso(b.cancelledAt), completedAt: iso(b.completedAt), autoCompleteAt: iso(b.autoCompleteAt) })),
    ...requests.map(({ couponSnapshot, ...r }) => ({ ...r, kind: "request" as const, travelFee: r.service.travelFee, coupon: coupon(couponSnapshot), createdAt: r.createdAt.toISOString(), respondedAt: iso(r.respondedAt), completedAt: iso(r.completedAt), vendorCompletedAt: iso(r.vendorCompletedAt), autoCompleteAt: iso(r.autoCompleteAt) })),
    ...subscriptions.map(({ product, sessionUsages, ...s }) => ({ ...s, kind: "subscription" as const, service: product, createdAt: s.createdAt.toISOString(), currentPeriodEnd: iso(s.currentPeriodEnd), nextChargeAt: iso(s.nextChargeAt), lastChargeAt: iso(s.lastChargeAt), canceledAt: iso(s.canceledAt), pausedAt: iso(s.pausedAt), pauseEndsAt: iso(s.pauseEndsAt), trialEndsAt: iso(s.trialEndsAt), sessions: sessionUsages.map(usage => ({ ...usage, usedAt: usage.usedAt.toISOString() })) })),
  ];
  return { store, records, renderedAt: new Date().toISOString() };
}
