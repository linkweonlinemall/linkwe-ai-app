import { getCheckinDb } from "./db";
import type { QueuedScan } from "./queue";
/** Both local admission and its durable sync record succeed, or neither does. */
export async function recordOfflineAdmission(scan: Omit<QueuedScan, "id">): Promise<"ADMITTED" | "DUPLICATE" | "INVALID"> {
  const db = await getCheckinDb();
  const tx = db.transaction(["allowlist", "syncQueue", "events"], "readwrite");
  const cached = await tx.objectStore("events").get(scan.eventId);
  const ticket = await tx.objectStore("allowlist").get(scan.qrToken);
  if (!cached || Date.now() - cached.cachedAt > 86400000 || !ticket || ticket.eventId !== scan.eventId || !scan.deviceId) { await tx.done; return "INVALID"; }
  if (ticket.usedLocally || ticket.status === "USED") { await tx.done; return "DUPLICATE"; }
  if (ticket.status !== "VALID") { await tx.done; return "INVALID"; }
  await tx.objectStore("allowlist").put({ ...ticket, status: "USED", usedLocally: true, usedAt: scan.scannedAt });
  await tx.objectStore("syncQueue").add(scan);
  await tx.done;
  return "ADMITTED";
}
