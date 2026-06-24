/** Maps legacy Satyakabir leave duration UI to CMS backend dayPart values. */

export type LeaveDurationUi = "full" | "half" | "short";
export type HalfDayPartUi = "first_half" | "second_half";

/** Today as YYYY-MM-DD in the given IANA timezone (defaults to browser local). */
export function getTodayDateKey(timezone?: string): string {
  const tz = timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** True when dateKey is strictly before today (company/browser timezone). */
export function isLeaveDateInPast(dateKey: string, timezone?: string): boolean {
  if (!dateKey) return false;
  return dateKey < getTodayDateKey(timezone);
}

export function resolveLeaveDayPart(
  duration: LeaveDurationUi,
  halfPart: HalfDayPartUi,
): string {
  if (duration === "full") return "full";
  if (duration === "short") return "short";
  return halfPart;
}

export function formatLeaveDayPartLabel(dayPart?: string | null): string {
  switch (dayPart) {
    case "full":
      return "Full day";
    case "first_half":
      return "Half day · First half";
    case "second_half":
      return "Half day · Second half";
    case "short":
      return "Short leave";
    default:
      return dayPart?.replace(/_/g, " ") ?? "—";
  }
}
