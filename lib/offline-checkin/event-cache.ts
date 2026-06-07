import { getCheckinDb } from "./db";

export type CachedEvent = {
  eventId: string;
  scanCode: string;
  eventTitle: string;
  eventStartDate: string;
  venueName?: string;
  cachedAt: number;
};

export async function saveCachedEvent(e: CachedEvent): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await getCheckinDb();
    await db.put("events", e);
  } catch {
    // Cache write failure must not block the gate.
  }
}

export async function getCachedEvent(eventId: string): Promise<CachedEvent | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return null;
  }

  try {
    const db = await getCheckinDb();
    const row = await db.get("events", eventId);
    return row ?? null;
  } catch {
    return null;
  }
}
