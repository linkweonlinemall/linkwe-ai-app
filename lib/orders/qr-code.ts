import QRCode from "qrcode";

import { getAppBaseUrl } from "@/lib/app-base-url";

export async function generateOrderQRCodeDataURL(orderId: string): Promise<string> {
  const appUrl = getAppBaseUrl();
  const orderUrl = `${appUrl}/orders/${orderId}`;

  const dataUrl = await QRCode.toDataURL(orderUrl, {
    width: 200,
    margin: 2,
    color: {
      dark: "#1C1C1A",
      light: "#FFFFFF",
    },
  });

  return dataUrl;
}

export function getOrderUrl(orderId: string): string {
  const appUrl = getAppBaseUrl();
  return `${appUrl}/orders/${orderId}`;
}
