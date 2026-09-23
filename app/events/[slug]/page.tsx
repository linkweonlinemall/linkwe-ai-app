import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCrossStoreFeatureButtonState } from "@/app/actions/cross-store";
import { getLinkedContent } from "@/app/actions/content-links";
import RequestFeatureButton from "@/components/cross-store/RequestFeatureButton";
import PublicNav from "@/components/layout/PublicNav";
import EventDetailView from "@/components/events/EventDetailView";
import { getRoleDashboardPath } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { getNavUnreadCount } from "@/lib/notifications/get-unread-count";
import { prisma } from "@/lib/prisma";
import { isStoreSellable, sellableStoreWhere } from "@/lib/store/sellable-store";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED", store: sellableStoreWhere() },
    select: { title: true, description: true, coverImage: true, metaTitle: true, metaDescription: true },
  });
  if (!event) return { title: "Event" };
  return {
    title: event.metaTitle || event.title,
    description: event.metaDescription || event.description?.replace(/<[^>]+>/g, "").slice(0, 160) || undefined,
    alternates: { canonical: "https://www.linkweonlinemall.com/events/" + slug },
    openGraph: event.coverImage ? { images: [{ url: event.coverImage, alt: event.title }] } : undefined,
    twitter: event.coverImage ? { card: "summary_large_image", images: [event.coverImage] } : undefined,
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const [session, unreadCount, event] = await Promise.all([
    getSession(), getNavUnreadCount(),
    prisma.event.findFirst({
      where: { slug },
      select: {
        id: true, slug: true, title: true, description: true, category: true, tags: true, organiserName: true,
        startDate: true, endDate: true, isOnline: true, venueName: true, address: true, latitude: true,
        longitude: true, region: true, capacity: true, dressCode: true, ticketPrice: true, ticketUrl: true,
        refundPolicy: true, registrationRequired: true, registrationDeadline: true, ageRestriction: true,
        status: true, eventType: true, coverImage: true, galleryImages: true, hasSeating: true, lineup: true,
        refundPolicyType: true, refundCutoffHours: true,
        store: { select: { name: true, slug: true, logoUrl: true, region: true, ownerId: true, status: true, owner: { select: { idVerificationStatus: true } } } },
        ticketTypes: { where: { isVisible: true }, orderBy: [{ price: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, price: true, quantity: true, quantitySold: true, description: true, perks: true, maxPerOrder: true, isVisible: true, saleStartDate: true, saleEnds: true, validDays: true, color: true } },
      },
    }),
  ]);
  if (!event || !["PUBLISHED", "CANCELLED"].includes(event.status)) notFound();
  const isOwner = session?.userId === event.store.ownerId;
  if (!isStoreSellable(event.store) && !isOwner && session?.role !== "ADMIN") notFound();
  const [user, { items: linkedItems }, featureButtonState] = await Promise.all([
    session ? prisma.user.findUnique({ where: { id: session.userId }, select: { fullName: true, role: true } }) : null,
    getLinkedContent("EVENT", event.id), getCrossStoreFeatureButtonState("EVENT", event.id),
  ]);
  const dashboard = user ? getRoleDashboardPath(user.role) : undefined;
  return <EventDetailView event={event} verified={isStoreSellable(event.store)} linkedItems={linkedItems}
    nav={<PublicNav user={user ? { name: user.fullName ?? "Account", href: dashboard! } : null} dashboardHref={dashboard} unreadCount={unreadCount}/>}
    featureAction={<RequestFeatureButton itemType="EVENT" itemId={event.id} storeName={event.store.name} canRequest={featureButtonState.canRequest} alreadyRequested={featureButtonState.alreadyRequested}/>}
  />;
}
