import { resend, FROM_EMAIL } from "./resend";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: `LinkWe <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Never crash the app over a failed email
    console.error("[email] Failed to send:", err);
  }
}
