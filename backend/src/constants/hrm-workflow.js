/** HRM workflow enums — not part of the CMS permission matrix. */
export const leaveRequestStatuses = ["pending", "approved", "rejected", "cancelled"];
export const leaveDayParts = ["full", "first_half", "second_half", "short"];
export const wfhRequestStatuses = ["pending", "approved", "rejected", "cancelled"];
export const departmentStatuses = ["active", "inactive"];
export const holidayTypes = ["public", "optional"];
export const holidayScopes = ["company", "department"];
export const correctionStatuses = ["pending", "approved", "rejected", "cancelled"];
export const dailyAttendanceSources = ["engine", "manual_correction", "admin_override"];
export const payrollRunStatuses = ["draft", "reviewed", "finalized", "paid"];
export const recruitmentStages = [
  "applied",
  "screening",
  "interview",
  "offer",
  "onboarding",
  "hired",
  "rejected",
];
export const onboardingStatuses = ["active", "complete"];

/** Default new-hire checklist (Satyakabir HRM parity). */
export const DEFAULT_ONBOARDING_TASKS = [
  "Offer accepted",
  "Documents collected",
  "Bank details",
  "Laptop assigned",
  "Email + Slack invite",
  "Org intro",
  "Manager 1:1",
  "Buddy assigned",
  "First week plan",
  "Probation review",
];

export const candidateSources = [
  "LinkedIn",
  "Referral",
  "Naukri",
  "Indeed",
  "Careers page",
  "Other",
];
export const documentStatuses = ["pending", "approved", "rejected"];
export const policyAckStatuses = ["pending", "acknowledged"];

export function isHrmManagerRole(role) {
  return role === "manager" || role === "super_admin" || role === "hr";
}
