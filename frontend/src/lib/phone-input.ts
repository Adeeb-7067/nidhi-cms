import { z } from "zod";

export const PHONE_NUMBER_LENGTH = 10;

const PHONE_DIGITS_ONLY = /^\d{10}$/;

/** Strip non-digits, normalize common Indian prefixes, cap at 10 characters. */
export function sanitizePhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, PHONE_NUMBER_LENGTH);
}

/** Hydrate form fields — blank legacy values that are not exactly 10 digits. */
export function normalizePhoneForForm(value: string | null | undefined): string {
  const digits = sanitizePhoneDigits(value ?? "");
  return PHONE_DIGITS_ONLY.test(digits) ? digits : "";
}

/** Returns an error message when value is non-empty but not exactly 10 digits. */
export function phoneValidationError(value: string | null | undefined): string | null {
  const digits = sanitizePhoneDigits(value ?? "");
  if (!digits) return null;
  if (!PHONE_DIGITS_ONLY.test(digits)) {
    return `Phone number must be exactly ${PHONE_NUMBER_LENGTH} digits`;
  }
  return null;
}

/** Zod schema: empty allowed, otherwise exactly 10 digits. */
export const optionalPhoneZod = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine(
    (val) => {
      const digits = sanitizePhoneDigits(val ?? "");
      return digits.length === 0 || PHONE_DIGITS_ONLY.test(digits);
    },
    { message: `Phone number must be exactly ${PHONE_NUMBER_LENGTH} digits` },
  );

export function normalizePhoneForSubmit(value: string | null | undefined): string {
  return sanitizePhoneDigits(value ?? "");
}
