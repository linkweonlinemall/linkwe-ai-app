"use client";

import { useEffect } from "react";

import { recordStorefrontView } from "@/app/actions/store-analytics";

const recordedThisPageLoad = new Set<string>();

export default function StorefrontViewTracker({ storeId }: { storeId: string }) {
  useEffect(() => {
    const key = `linkwe-store-view:${storeId}`;
    if (recordedThisPageLoad.has(key)) return;

    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // The in-memory guard still prevents duplicate React effect calls.
    }

    recordedThisPageLoad.add(key);
    void recordStorefrontView(storeId);
  }, [storeId]);

  return null;
}
