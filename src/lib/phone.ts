/**
 * Customers are stored against the 10-digit Nepal mobile they typed at
 * checkout (9801111111). Tracking accepts the same number with or without a
 * country code.
 */
export function normalizeNepalPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("977") && digits.length === 13) {
    digits = digits.slice(3);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (!/^9\d{9}$/.test(digits)) return null;
  return digits;
}

/** Forms the same number might have been saved as. */
export function phoneLookupKeys(normalized: string): string[] {
  return [normalized, `0${normalized}`, `977${normalized}`, `+977${normalized}`];
}

/** Opens the device dialer. Nepal 10-digit mobiles become +977… */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return `tel:${trimmed.replace(/[^\d+]/g, "")}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) {
    return `tel:+977${digits}`;
  }
  return `tel:${digits || trimmed}`;
}
