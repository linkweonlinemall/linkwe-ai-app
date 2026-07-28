/**
 * Validates and normalizes a Trinidad & Tobago phone number.
 *
 * Loose rule: after stripping all non-digits, expects one of:
 *   - 7 digits  (local number only)           "456-1234"        → "+18684561234"
 *   - 10 digits starting with 868              "868 456 1234"    → "+18684561234"
 *   - 11 digits starting with 1868             "+1 (868) 456-1234" → "+18684561234"
 *
 * All forms normalize to canonical "+1868XXXXXXX".
 *
 * Returns { ok: true, normalized } or { ok: false, error }.
 *
 * Blank/empty input returns { ok: false }. Callers that allow a blank phone
 * must check for blank BEFORE calling and skip the call when blank.
 */
export function normalizeTTPhone(
  raw: string,
): { ok: true; normalized: string } | { ok: false; error: string } {
  const digits = raw.replace(/\D/g, "");

  let local: string;
  if (digits.length === 7) {
    local = digits;
  } else if (digits.length === 10 && digits.startsWith("868")) {
    local = digits.slice(3);
  } else if (digits.length === 11 && digits.startsWith("1868")) {
    local = digits.slice(4);
  } else {
    return {
      ok: false,
      error: "Enter a valid 7-digit Trinidad & Tobago phone number.",
    };
  }

  return { ok: true, normalized: "+1868" + local };
}
