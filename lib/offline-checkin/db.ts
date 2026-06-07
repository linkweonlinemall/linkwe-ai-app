import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "linkwe-checkin";
const DB_VERSION = 2;

export type CheckinDb = IDBPDatabase;

export async function getCheckinDb(): Promise<CheckinDb> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable");
  }

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("allowlist")) {
        const allowlist = db.createObjectStore("allowlist", { keyPath: "qrToken" });
        allowlist.createIndex("by_event", "eventId");
      }

      if (!db.objectStoreNames.contains("scanLog")) {
        db.createObjectStore("scanLog", { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events", { keyPath: "eventId" });
      }
    },
  });
}
