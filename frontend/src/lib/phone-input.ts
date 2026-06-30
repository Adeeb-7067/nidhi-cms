import { z } from "zod";

export const PHONE_NUMBER_LENGTH = 10;

const PHONE_DIGITS_ONLY = /^\d{10}$/;

/** Strip non-digits and cap at 10 characters for controlled inputs. */
export function sanitizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_NUMBER_LENGTH);
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
