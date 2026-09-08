const ONESIGNAL_APP_ID = "58c03778-9ace-4ff9-afdb-f436f1e530c6";
const LINKWE_ORIGIN = "https://www.linkweonlinemall.com";

function toAbsoluteUrl(path?: string) {
  if (!path) return LINKWE_ORIGIN;

  try {
    return new URL(path, LINKWE_ORIGIN).toString();
  } catch {
    return LINKWE_ORIGIN;
  }
}

export async function sendPushNotification(input: {
  userId: string;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!apiKey) return;

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [input.userId] },
      target_channel: "push",
      headings: { en: input.title },
      contents: { en: input.body?.trim() || input.title },
      url: toAbsoluteUrl(input.linkUrl),
      chrome_web_icon: `${LINKWE_ORIGIN}/linkwe-pwa-192-v3.png`,
      chrome_web_badge: `${LINKWE_ORIGIN}/linkwe-pwa-72-v3.png`,
      name: `LinkWe: ${input.title}`.slice(0, 128),
    }),
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`OneSignal rejected push notification (${response.status})`);
  }
}
