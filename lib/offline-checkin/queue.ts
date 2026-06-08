import { getCheckinDb } from "./db";

export type QueuedScan = {
  id?: number;
  qrToken: string;
  eventId: string;
  scannedAt: number;
  deviceId: string;
};

export async function enqueueScan(scan: Omit<QueuedScan, "id">): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await getCheckinDb();
    await db.add("syncQueue", scan);
  } catch {
    // Queue write failure must not block offline admit.
  }
}

export async function getQueuedScans(): Promise<QueuedScan[]> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return [];
  }

  try {
    const db = await getCheckinDb();
    return await db.getAll("syncQueue");
  } catch {
    return [];
  }
}

export async function deleteQueuedScans(ids: number[]): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined" || ids.length === 0) {
    return;
  }

  try {
    const db = await getCheckinDb();
    const tx = db.transaction("syncQueue", "readwrite");
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  } catch {
    // Dequeue failure leaves rows for a later retry.
  }
}
