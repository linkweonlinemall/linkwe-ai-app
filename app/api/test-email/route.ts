import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { orderConfirmedCustomerEmail } from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";

export async function GET() {
  await sendEmail({
    to: "admin@linkwemall.com",
    ...orderConfirmedCustomerEmail({
      customerName: "Test User",
      orderRef: "TEST-001",
      itemCount: 2,
      totalTTD: 250.0,
      orderUrl: `${BASE_URL}/orders/test`,
    }),
  });
  return NextResponse.json({ ok: true, message: "Test email sent to admin@linkwemall.com" });
}
