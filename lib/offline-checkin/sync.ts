import { syncOfflineCheckIns } from "@/app/actions/ticket-checkin";
import { getQueuedScans } from "./queue";
import { getCheckinDb } from "./db";
const inFlight = new Set<string>();
export async function syncQueuedScans(eventId: string, scanCode: string): Promise<{ synced: number; conflicts: number }> {
  if (inFlight.has(eventId)) return { synced: 0, conflicts: 0 };
  inFlight.add(eventId);
  try {
    const queued = (await getQueuedScans()).filter(scan => scan.eventId === eventId).slice(0,100);
    if (!queued.length) return { synced: 0, conflicts: 0 };
    const result = await syncOfflineCheckIns(eventId, scanCode, queued);
    if (!result.ok) return { synced: 0, conflicts: 0 };
    const db = await getCheckinDb();
    const tx = db.transaction(["syncQueue", "scanLog"], "readwrite");
    let synced=0, conflicts=0;
    for (let index=0; index<queued.length; index++) {
      const scan=queued[index], response=result.results[index];
      if (!response || response.qrToken!==scan.qrToken || response.outcome==="retry" || scan.id===undefined) continue;
      // Keep a durable outcome before removing an acknowledged queue entry.
      await tx.objectStore("scanLog").put({ ...scan, outcome: response.outcome, syncedAt: Date.now() });
      await tx.objectStore("syncQueue").delete(scan.id);
      synced++;
      if(response.outcome!=="ADMITTED")conflicts++;
    }
    await tx.done;
    return { synced, conflicts };
  } catch { return { synced: 0, conflicts: 0 }; }
  finally { inFlight.delete(eventId); }
}
