import { prisma } from "@/lib/prisma";

export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<{ allowed: boolean; remainingAttempts: number; resetAt: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const record = await prisma.rateLimit.findUnique({ where: { key } });

    if (!record || now > record.resetAt) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, remainingAttempts: maxAttempts - 1, resetAt: resetAt.getTime() };
    }

    if (record.count >= maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetAt: record.resetAt.getTime(),
      };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return {
      allowed: true,
      remainingAttempts: maxAttempts - record.count - 1,
      resetAt: record.resetAt.getTime(),
    };
  } catch {
    // If rate limit check fails, allow the request
    return { allowed: true, remainingAttempts: maxAttempts, resetAt: resetAt.getTime() };
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await prisma.rateLimit.delete({ where: { key } });
  } catch {
    // ignore if not found
  }
}
