const DEFAULT_APP_BASE_URL = "http://localhost:3000";

/** First non-empty NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_APP_URL, without trailing slash. */
export function getAppBaseUrl(): string {
  const base =
    [process.env.NEXT_PUBLIC_BASE_URL, process.env.NEXT_PUBLIC_APP_URL].find(
      (v) => v && v.trim().length > 0,
    )?.trim() ?? DEFAULT_APP_BASE_URL;

  return base.replace(/\/+$/, "");
}
