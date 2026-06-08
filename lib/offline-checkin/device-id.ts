const DEVICE_ID_KEY = "linkwe_scan_device_id";
const DEVICE_LABEL_KEY = "linkwe_scan_device_label";

export function getDeviceLabel(): string {
  if (typeof window === "undefined") return "";

  try {
    return localStorage.getItem(DEVICE_LABEL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setDeviceLabel(label: string): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(DEVICE_LABEL_KEY, label.trim());
  } catch {
    // Label save failure must not block scanning.
  }
}

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
