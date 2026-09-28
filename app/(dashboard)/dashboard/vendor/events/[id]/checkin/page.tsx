import EventOperationsHeader from "@/components/events/operations/EventOperationsHeader";
import s from "@/components/events/operations/operations.module.css";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { CheckInScanner } from "./CheckInScanner";
import { StaffScanCodePanel } from "./StaffScanCodePanel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventCheckInPage({ params }: Props) {
  const { id } = await params;

  const session = await getSession();
  if (!session || session.role !== "VENDOR") redirect("/login");

  const store = await prisma.store.findFirst({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (!store) redirect("/dashboard/vendor");

  const event = await prisma.event.findFirst({
    where: { id, storeId: store.id },
    select: {
      id: true,
      title: true,
      startDate: true,
      venueName: true,
      scanCode: true,
      scanCodeSetAt: true,
    },
  });
  if (!event) redirect("/dashboard/vendor/events");

  return <div className={s.page}><EventOperationsHeader event={event} tab="checkin"/>
    <CheckInScanner eventId={event.id} eventTitle={event.title} scanCode={event.scanCode ?? undefined}/>
    <div className={s.staff}><StaffScanCodePanel eventId={event.id} initialScanCode={event.scanCode} initialScanCodeSetAt={event.scanCodeSetAt?.toISOString() ?? null}/></div>
  </div>;
}
