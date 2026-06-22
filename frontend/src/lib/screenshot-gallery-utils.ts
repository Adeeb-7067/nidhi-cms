import { format, isToday, isYesterday } from "date-fns";
import type { ScreenshotItem } from "@/api/monitoring";

export function hourLabel(h: number) {
  const start = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
  const end = h + 1 === 12 ? "12 PM" : h + 1 < 12 ? `${h + 1} AM` : h + 1 === 24 ? "12 AM" : `${h + 1 - 12} PM`;
  return `${start} – ${end}`;
}

/** Local calendar day bounds for API filters. */
export function localDayRange(date: Date): { startDate: string; endDate: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const start = new Date(y, m, d, 0, 0, 0, 0);
  const end = new Date(y, m, d, 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function dateNavLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

export function isFutureCalendarDate(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d);
  cmp.setHours(0, 0, 0, 0);
  return cmp > today;
}

export function groupScreenshotsByHour(items: ScreenshotItem[]) {
  const byHour = new Map<number, ScreenshotItem[]>();
  for (const item of items) {
    const h = new Date(item.takenAt).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(item);
  }
  for (const [h, list] of byHour.entries()) {
    byHour.set(
      h,
      [...list].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()),
    );
  }
  return byHour;
}

export function screenshotImageUrl(item: ScreenshotItem | undefined): string | null {
  const url = item?.fileUrl?.trim();
  return url || null;
}

export function formatCaptureTimestamp(takenAt: string) {
  const d = new Date(takenAt);
  return `${format(d, "MMM d, yyyy")} · ${format(d, "h:mm:ss a")}`;
}
