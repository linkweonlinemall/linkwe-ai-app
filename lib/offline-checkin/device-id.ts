const DEVICE_ID_KEY = "linkwe_scan_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const id = `dev_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}
