import { getSession } from "@/lib/auth/session"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EditEventForm, type EventFormData } from "./EditEventForm"

export const dynamic = 'force-dynamic'

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/login")

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
  })
  if (!store) redirect("/dashboard/vendor")

  const event = await prisma.event.findFirst({
    where: { id, storeId: store.id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      category: true,
      tags: true,
      organiserName: true,
      startDate: true,
      endDate: true,
      isOnline: true,
      venueName: true,
      address: true,
      region: true,
      capacity: true,
      dressCode: true,
      ageRestriction: true,
      refundPolicy: true,
      refundPolicyType: true,
      refundCutoffHours: true,
      registrationRequired: true,
      registrationDeadline: true,
      coverImage: true,
      galleryImages: true,
      streamUrl: true,
      hasSeating: true,
      eventType: true,
      lineup: true,
      status: true,
      isPublished: true,
    },
  })

  if (!event) redirect("/dashboard/vendor/events")

  return (
    <EditEventForm
      event={{
        ...event,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate?.toISOString() ?? null,
        registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
        refundPolicyType: event.refundPolicyType as "FULL" | "PARTIAL" | "NONE",
        lineup: Array.isArray(event.lineup) ? (event.lineup as EventFormData["lineup"]) : null,
      }}
    />
  )
}
