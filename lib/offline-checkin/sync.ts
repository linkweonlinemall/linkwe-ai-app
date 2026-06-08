import { syncOfflineCheckIns } from "@/app/actions/ticket-checkin";

import { deleteQueuedScans, getQueuedScans } from "./queue";

export async function syncQueuedScans(
  eventId: string,
  scanCode: string,
): Promise<{ synced: number }> {
  try {
    const queued = await getQueuedScans();
    const forEvent = queued.filter((scan) => scan.eventId === eventId);
    if (forEvent.length === 0) {
      return { synced: 0 };
    }

    const result = await syncOfflineCheckIns(
      eventId,
      scanCode,
      forEvent.map((scan) => ({
        qrToken: scan.qrToken,
        scannedAt: scan.scannedAt,
        deviceId: scan.deviceId,
      })),
    );

    if (!result.ok) {
      return { synced: 0 };
    }

    const ids = forEvent
      .map((scan) => scan.id)
      .filter((id): id is number => typeof id === "number");

    await deleteQueuedScans(ids);
    return { synced: ids.length };
  } catch {
    return { synced: 0 };
  }
}
