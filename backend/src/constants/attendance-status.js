/** Primary attendance statuses shown in HRM UI and corrections. */
export const PRIMARY_ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "on_leave",
  "onsite",
  "wfh",
  "half_day",
];

/** Statuses that count as paid working days (when compliance is not absent). */
export const PAID_ATTENDANCE_STATUSES = new Set([
  "present",
  "onsite",
  "late",
  "wfh",
  "holiday",
  "on_leave",
  "half_day",
]);

/** Statuses that count toward “present today” KPIs and charts. */
export const PRESENT_LIKE_STATUSES = new Set(["present", "onsite", "late", "wfh"]);

/** Map legacy persisted statuses to the current primary set for API responses. */
export function normalizeAttendanceStatus(status) {
  if (status === "late") return "onsite";
  if (status === "short") return "half_day";
  return status;
}

export function isPresentLikeStatus(status) {
  return PRESENT_LIKE_STATUSES.has(status);
}

export function isPaidAttendanceStatus(status) {
  return PAID_ATTENDANCE_STATUSES.has(status);
}
