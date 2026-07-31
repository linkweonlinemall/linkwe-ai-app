import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailAddressEmail } from "@/lib/email/templates";
import { BASE_URL } from "@/lib/email/resend";

export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  fullName: string | null;
}): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifyToken: token, emailVerifyTokenExpiry: expiry },
  });

  const verifyUrl = `${BASE_URL}/verify-email?token=${token}`;

  try {
    await sendEmail({
      to: user.email,
      ...verifyEmailAddressEmail({ fullName: user.fullName ?? "there", verifyUrl }),
    });
  } catch (emailErr) {
    console.error("VERIFICATION EMAIL ERROR:", emailErr);
  }
}
