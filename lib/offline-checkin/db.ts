import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "linkwe-checkin";
const DB_VERSION = 1;

export type CheckinDb = IDBPDatabase;

export async function getCheckinDb(): Promise<CheckinDb> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable");
  }

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const allowlist = db.createObjectStore("allowlist", { keyPath: "qrToken" });
      allowlist.createIndex("by_event", "eventId");

      db.createObjectStore("scanLog", { keyPath: "id", autoIncrement: true });
      db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
    },
  });
}
