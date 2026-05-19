import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !topic || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const topicLabels: Record<string, string> = {
      order: "Order issue",
      vendor: "Vendor support",
      courier: "Courier support",
      billing: "Billing or payment",
      account: "Account issue",
      report: "Report a problem",
      other: "Other",
    };

    await sendEmail({
      to: "admin@linkwemall.com",
      subject: `[LinkWe Contact] ${topicLabels[topic] ?? topic} from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D4450A;">New contact form submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #52525b;">Name</td>
              <td style="padding: 8px;">${name}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #52525b;">Email</td>
              <td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #52525b;">Topic</td>
              <td style="padding: 8px;">${topicLabels[topic] ?? topic}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #52525b; vertical-align: top;">Message</td>
              <td style="padding: 8px; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
        </div>
      `,
    });

    // Also send confirmation to the person who contacted
    await sendEmail({
      to: email,
      subject: "We received your message — LinkWe",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #D4450A;">Thanks for reaching out, ${name}!</h2>
          <p style="color: #52525b;">We have received your message and will get back to you within 24 hours at this email address.</p>
          <p style="color: #52525b;"><strong>Your message:</strong></p>
          <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; color: #52525b; white-space: pre-wrap;">${message}</div>
          <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">LinkWe Online Directory · Trinidad & Tobago</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Failed to send:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
