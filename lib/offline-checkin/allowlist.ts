import { getCheckinDb } from "./db";

export type AllowlistTicket = {
  qrToken: string;
  ticketNumber: string;
  holderName: string;
  ticketTypeName: string;
  status: string;
  eventId: string;
  usedLocally?: boolean;
  usedAt?: number;
};

export async function saveAllowlist(
  eventId: string,
  tickets: Omit<AllowlistTicket, "eventId">[],
): Promise<void> {
  const db = await getCheckinDb();
  const tx = db.transaction(["allowlist", "syncQueue"], "readwrite");
  const store = tx.objectStore("allowlist");
  const pending = new Set((await tx.objectStore("syncQueue").getAll()).filter(scan => scan.eventId === eventId).map(scan => scan.qrToken));
  const existing = await store.index("by_event").getAll(eventId);
  const local = new Map(existing.map(row => [row.qrToken, row]));
  await Promise.all(existing.map(row => store.delete(row.qrToken)));
  for (const ticket of tickets) {
    const previous = local.get(ticket.qrToken);
    await store.put({ ...ticket, eventId, ...(pending.has(ticket.qrToken) && previous?.usedLocally ? { usedLocally: true, usedAt: previous.usedAt, status: "USED" } : {}) });
  }
  await tx.done;
}

export async function countAllowlist(eventId: string): Promise<number> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return 0;
  }

  try {
    const db = await getCheckinDb();
    const keys = await db.transaction("allowlist").store.index("by_event").getAllKeys(eventId);
    return keys.length;
  } catch {
    return 0;
  }
}

export async function lookupTicket(qrToken: string): Promise<AllowlistTicket | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return null;
  }

  try {
    const db = await getCheckinDb();
    const row = await db.get("allowlist", qrToken);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function markUsedLocally(qrToken: string): Promise<void> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await getCheckinDb();
    const row = await db.get("allowlist", qrToken);
    if (!row) return;

    await db.put("allowlist", {
      ...row,
      usedLocally: true,
      usedAt: Date.now(),
      status: "USED",
    });
  } catch {
    // Local mark failure must not crash the scanner.
  }
}
