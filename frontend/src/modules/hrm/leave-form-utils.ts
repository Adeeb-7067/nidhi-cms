/** Maps legacy Satyakabir leave duration UI to CMS backend dayPart values. */

export type LeaveDurationUi = "full" | "half" | "short";
export type HalfDayPartUi = "first_half" | "second_half";

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
