import { badRequest } from "./route-errors.js";

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Calendar date at UTC noon — avoids off-by-one when storing YYYY-MM-DD from the UI. */
export function parseCalendarDateOnly(value) {
  const trimmed = String(value).trim();
  const match = DATE_ONLY_RE.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return null;
  }
  return parsed;
}

/** Parse a document date from the API (YYYY-MM-DD or ISO). Defaults to now when omitted. */
export function parseSalesDocumentDate(value, fieldName, { defaultNow = true } = {}) {
  if (value == null || value === "") {
    if (defaultNow) return new Date();
    return null;
  }
  const dateOnly = parseCalendarDateOnly(value);
  if (typeof value === "string" && DATE_ONLY_RE.test(String(value).trim()) && !dateOnly) {
    badRequest(`${fieldName} is invalid.`, fieldName);
  }
  const parsed = dateOnly ?? new Date(value);
  if (Number.isNaN(parsed.getTime())) badRequest(`${fieldName} is invalid.`, fieldName);
  return parsed;
}
