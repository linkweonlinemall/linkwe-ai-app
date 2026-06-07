import { randomBytes, timingSafeEqual } from "crypto";

/** URL-safe, human-typable; excludes 0/O, 1/I/l. */
const SCAN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const SCAN_CODE_LENGTH = 10;

export function generateEventScanCodeValue(): string {
  const bytes = randomBytes(SCAN_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SCAN_CODE_LENGTH; i++) {
    code += SCAN_CODE_ALPHABET[bytes[i]! % SCAN_CODE_ALPHABET.length];
  }
  return code;
}

export function eventScanCodesMatch(
  stored: string | null | undefined,
  supplied: string | null | undefined,
): boolean {
  const storedNorm = stored?.trim() ?? "";
  const suppliedNorm = supplied?.trim() ?? "";
  if (!storedNorm || !suppliedNorm) return false;

  const a = Buffer.from(storedNorm);
  const b = Buffer.from(suppliedNorm);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
