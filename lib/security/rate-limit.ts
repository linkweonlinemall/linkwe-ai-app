const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 minutes
): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remainingAttempts: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { allowed: true, remainingAttempts: maxAttempts - record.count, resetAt: record.resetAt };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

// Clean up expired entries every 30 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attempts.entries()) {
      if (now > record.resetAt) attempts.delete(key);
    }
  }, 30 * 60 * 1000);
}
