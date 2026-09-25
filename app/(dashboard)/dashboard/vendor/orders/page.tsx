import { redirect } from "next/navigation";
import { getVendorBookings } from "@/app/actions/booking";
import { getVendorOnDemandRequests } from "@/app/actions/on-demand";
import { getMyStoreSubscribers } from "@/app/actions/service-subscription";
import OrdersTab from "@/app/(dashboard)/dashboard/vendor/components/tabs/orders-tab";
import { assertDashboardRole } from "@/lib/auth/assert-role";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { vendorSplitOrderListSelect } from "@/lib/vendor/vendor-split-order-query";
import { orderDate, type OrderRow } from "@/lib/vendor/order-workspace";

type Props = { searchParams: Promise<{ view?: string | string[] }> };

export default async function VendorOrdersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  assertDashboardRole(session, "VENDOR");
  const store = await prisma.store.findFirst({ where: { ownerId: session.userId }, select: { id: true } });
  if (!store) redirect("/onboarding/business/step-3");
  const query = await searchParams;
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view = requestedView === "services" ? "services" : "products";
  const [splitOrders, bookings, requests, subscribersResult] = await Promise.all([
    prisma.splitOrder.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, select: {
      ...vendorSplitOrderListSelect, referenceNumber: true, storeId: true,
      mainOrder: { select: { ...vendorSplitOrderListSelect.mainOrder.select, referenceNumber: true, status: true, shippingAddressId: true,
        items: { where: { storeId: store.id }, select: { storeId: true, product: { select: { isDigital: true } } } },
      } },
    } }),
    getVendorBookings("all"), getVendorOnDemandRequests(), getMyStoreSubscribers(),
  ]);
  const subscribers = subscribersResult.ok ? subscribersResult.subscribers : [];
  const serviceOrders: OrderRow[] = [
    ...bookings.map(booking => ({ id: booking.id, kind: "booking" as const, reference: `BK-${booking.id.slice(-8).toUpperCase()}`, title: booking.product.name, customer: booking.customer?.fullName ?? "Customer", status: booking.status, amountMinor: Math.round(booking.totalPrice * 100), currency: "TTD", createdAt: booking.createdAt.toISOString(), detail: `${orderDate(booking.bookingDate)} · ${booking.startTime}–${booking.endTime}`, href: `/dashboard/vendor/orders/service/booking/${booking.id}` })),
    ...requests.map(request => ({ id: request.id, kind: request.requestType === "QUOTE" ? "quote" as const : "request" as const, reference: `${request.requestType === "QUOTE" ? "QT" : "RQ"}-${request.id.slice(-8).toUpperCase()}`, title: request.service.name, customer: request.customer.fullName ?? "Customer", status: request.status === "CONFIRMED" && request.vendorCompletedAt ? "AWAITING_CUSTOMER_CONFIRMATION" : request.status, amountMinor: request.quotedPrice == null ? null : Math.round(request.quotedPrice * 100), currency: "TTD", createdAt: request.createdAt.toISOString(), detail: request.estimatedArrival ? `Expected: ${request.estimatedArrival}` : request.requestType === "QUOTE" ? "Custom service quote" : "On-demand service", href: `/dashboard/vendor/orders/service/request/${request.id}` })),
    ...subscribers.map(subscription => ({ id: subscription.id, kind: "subscription" as const, reference: `SU-${subscription.id.slice(-8).toUpperCase()}`, title: subscription.product.name, customer: subscription.customer.fullName ?? "Customer", status: subscription.status === "ACTIVE" && subscription.cancelAtPeriodEnd ? "ENDING_SOON" : subscription.status, amountMinor: subscription.priceMinor, currency: "TTD", createdAt: subscription.createdAt.toISOString(), detail: `Recurring · ${subscription.interval}`, href: `/dashboard/vendor/orders/service/subscription/${subscription.id}` })),
  ];
  // Server request timestamp is serialized once for stable client-side date filtering.
  // eslint-disable-next-line react-hooks/purity
  return <OrdersTab splitOrders={splitOrders} serviceOrders={serviceOrders} view={view} now={Date.now()}/>;
}
