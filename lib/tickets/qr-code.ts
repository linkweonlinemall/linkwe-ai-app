import QRCode from "qrcode";

import { getAppBaseUrl } from "@/lib/app-base-url";

export function getTicketCheckInUrl(qrToken: string): string {
  const appUrl = getAppBaseUrl();
  return `${appUrl}/checkin/${qrToken}`;
}

export async function generateTicketQRCodeDataURL(qrToken: string): Promise<string> {
  const checkInUrl = getTicketCheckInUrl(qrToken);

  const dataUrl = await QRCode.toDataURL(checkInUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: "#1C1C1A",
      light: "#FFFFFF",
    },
  });

  return dataUrl;
}
