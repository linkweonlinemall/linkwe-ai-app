import "server-only";

export class PhotoStudioError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function photoStudioConfig(env = process.env) {
  const key = env.PHOTOROOM_API_KEY?.trim() || "";
  const mode = env.PHOTO_STUDIO_MODE || "sandbox";
  const sandbox = mode !== "production";
  const positive = (value: string | undefined, fallback: number) => {
    const n = Number(value ?? fallback);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  };
  const monthlyLimit = positive(env.PHOTO_STUDIO_MONTHLY_LIMIT, sandbox ? 100 : 0);
  const dailyStoreLimit = positive(env.PHOTO_STUDIO_STORE_DAILY_LIMIT, 10);
  const lifetimeLimit = env.PHOTO_STUDIO_LIFETIME_LIMIT === undefined ? null : positive(env.PHOTO_STUDIO_LIFETIME_LIMIT, 0);
  const ready = !!key && ["sandbox", "production"].includes(mode) && monthlyLimit > 0 && dailyStoreLimit > 0 && lifetimeLimit !== 0 && (sandbox || !key.startsWith("sandbox_"));
  return { ready, sandbox, monthlyLimit, dailyStoreLimit, lifetimeLimit, key: sandbox && key && !key.startsWith("sandbox_") ? `sandbox_${key}` : key };
}
