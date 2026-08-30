import { BASE_URL } from "@/lib/email/resend";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";

type AdminAlertInput = {
  title: string;
  body: string;
  linkUrl: string;
  emailSubject?: string;
};

/** Sends the same actionable alert to every active LinkWe administrator. */
export async function alertAdmins(input: AdminAlertInput): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true, email: true },
  });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "GENERAL" as const,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    })),
  });

  const absoluteUrl = new URL(input.linkUrl, BASE_URL).toString();
  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: input.emailSubject ?? input.title,
        html: `<!doctype html><html><body style="margin:0;background:#f7f5f2;font-family:Arial,sans-serif;color:#1c1c1a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:auto;background:#fff;border:1px solid #e5e1dc;border-radius:20px;overflow:hidden"><tr><td style="padding:22px 28px;background:#1c1c1a"><img src="${BASE_URL}/linkwe-logo-on-dark.png" alt="LinkWe" width="126" style="display:block;max-height:42px;object-fit:contain"></td></tr><tr><td style="padding:32px 28px"><p style="margin:0 0 8px;color:#d4450a;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Admin action required</p><h1 style="margin:0 0 14px;font-size:25px;line-height:1.2">${input.title}</h1><p style="margin:0 0 24px;color:#625f5b;font-size:15px;line-height:1.65">${input.body}</p><a href="${absoluteUrl}" style="display:inline-block;background:#d4450a;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:12px">Review in LinkWe</a></td></tr><tr><td style="padding:18px 28px;border-top:1px solid #eee9e4;color:#8a8681;font-size:12px">We People. We Business. We Marketplace.</td></tr></table></td></tr></table></body></html>`,
      }),
    ),
  );
}
