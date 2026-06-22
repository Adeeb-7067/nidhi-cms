import { getOrCreateSettings } from "../company-settings.js";
import { resolveWorkDayTimezone, workDayKey } from "../work-session-policy.js";

export function parseDateKey(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  return str;
}

/** Normalize API date input to YYYY-MM-DD or null when invalid. */
export function normalizeDateKey(value) {
  if (value == null || value === "") return null;
  return parseDateKey(String(value).slice(0, 10));
}

export function eachDateInRange(startDate, endDate) {
  const dates = [];
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function getDayOfWeek(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export async function getHrmPolicyContext() {
  const settings = await getOrCreateSettings();
  const timezone = resolveWorkDayTimezone(settings.complianceTimezone);
  return {
    settings,
    timezone,
    weekendDays: settings.hrmWeekendDays?.length ? settings.hrmWeekendDays : [0, 6],
    shortfallThreshold: settings.hrmAttendanceShortfallThresholdMinutes ?? 0,
    defaultExpectedMinutes: Math.round((settings.requiredDailyWorkHours ?? 8) * 60),
  };
}

export function countWorkingDays(startDate, endDate, weekendDays, holidayDates = new Set()) {
  let count = 0;
  for (const date of eachDateInRange(startDate, endDate)) {
    if (weekendDays.includes(getDayOfWeek(date))) continue;
    if (holidayDates.has(date)) continue;
    count += 1;
  }
  return count;
}

export function datesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function workDayKeyForDate(date, timezone) {
  return workDayKey(date, timezone);
}

/** Minutes since local midnight in the given IANA timezone. */
export function minutesInTimezone(date, tz) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(date));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
