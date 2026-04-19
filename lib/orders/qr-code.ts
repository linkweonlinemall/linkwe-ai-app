import QRCode from "qrcode";

export async function generateOrderQRCodeDataURL(orderId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/orders/${orderId}`;
}
