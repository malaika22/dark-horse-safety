const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 15;

/** Canonical phone storage/lookup — digits only so +1… and 1… match. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  return digits.length >= PHONE_DIGITS_MIN && digits.length <= PHONE_DIGITS_MAX;
}
