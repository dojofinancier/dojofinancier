/**
 * Normalize phone input to E.164 (+country + digits).
 * Accepts values already in E.164, or common NANP shapes (10/11 digits, optional separators).
 */

const E164_RE = /^\+[1-9]\d{6,14}$/;

/** NANP: NXX-NXX-XXXX (N = 2–9 for area/exchange leading digit). */
const NANP_10_RE = /^[2-9]\d{2}[2-9]\d{6}$/;

export function normalizePhoneToE164(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (E164_RE.test(trimmed)) return trimmed;

  const digitsOnly = trimmed.replace(/\D/g, "");
  let d = digitsOnly;
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length === 10 && NANP_10_RE.test(d)) {
    return `+1${d}`;
  }

  return null;
}
