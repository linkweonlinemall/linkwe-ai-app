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
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return;
  }

  try {
    const db = await getCheckinDb();
    const tx = db.transaction("allowlist", "readwrite");
    const store = tx.objectStore("allowlist");
    const existingKeys = await store.index("by_event").getAllKeys(eventId);

    await Promise.all(existingKeys.map((key) => store.delete(key)));

    for (const ticket of tickets) {
      await store.put({ ...ticket, eventId });
    }

    await tx.done;
  } catch {
    // Allowlist write failure must not block the gate.
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
