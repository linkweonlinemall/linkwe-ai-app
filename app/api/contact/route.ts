import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !topic || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Log to console for now — swap for email service later
    console.log("=== CONTACT FORM SUBMISSION ===");
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Topic: ${topic}`);
    console.log(`Message: ${message}`);
    console.log("================================");

    // TODO: Replace with actual email sending when email service is configured
    // e.g. Resend, SendGrid, Nodemailer
    // await sendEmail({
    //   to: "admin@linkwemall.com",
    //   subject: `[LinkWe Contact] ${topic} from ${name}`,
    //   body: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`
    // });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
