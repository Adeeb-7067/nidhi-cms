import { randomUUID } from "crypto";

/** Bug tracking: QA fixed?, Dev fixed?, Final resolved? */

export const TRACK_STATUSES = ["open", "fixed"];
export const FINAL_STATUSES = ["open", "resolved"];

export const BUG_STATUSES = [
  "reported",
  "assigned",
  "in_progress",
  "fixed",
  "pending_qa_verification",
  "reopened",
  "closed",
];

const LEGACY_STATUS_MAP = {
  open: "reported",
  verified: "closed",
  wont_fix: "closed",
  duplicate: "closed",
};

export const CLOSED_BUG_STATUSES = ["closed", "verified", "wont_fix", "duplicate"];

export function normalizeTrackStatus(value) {
  return value === "fixed" ? "fixed" : "open";
}

export function normalizeFinalStatus(value) {
  return value === "resolved" ? "resolved" : "open";
}

export function normalizeBugStatus(status) {
  if (!status) return "reported";
  return LEGACY_STATUS_MAP[status] ?? status;
}

/** Sync legacy `status` for old clients / filters */
export function deriveLegacyStatus(bug) {
  const final = normalizeFinalStatus(bug.finalStatus);
  const qa = normalizeTrackStatus(bug.qaStatus);
  const dev = normalizeTrackStatus(bug.devStatus);
  if (final === "resolved") return "closed";
  if (qa === "fixed" && dev === "fixed") return "fixed";
  if (dev === "fixed") return "pending_qa_verification";
  const hasAssignees =
    bug.assigneeId ||
    (Array.isArray(bug.assigneeIds) && bug.assigneeIds.length > 0);
  if (hasAssignees) return "assigned";
  return normalizeBugStatus(bug.status) || "reported";
}

export function defaultTrackFields() {
  return { qaStatus: "open", devStatus: "open", finalStatus: "open" };
}

export function normalizeIssueInput(item) {
  return {
    key: String(item?.key ?? item?.issueKey ?? cryptoRandom()),
    title: String(item?.title ?? "").trim(),
    qaStatus: normalizeTrackStatus(item?.qaStatus),
    devStatus: normalizeTrackStatus(item?.devStatus),
    finalStatus: normalizeFinalStatus(item?.finalStatus),
  };
}

function cryptoRandom() {
  return `iss-${randomUUID()}`;
}

export function rollupFromIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return defaultTrackFields();
  return {
    qaStatus: issues.every((i) => normalizeTrackStatus(i.qaStatus) === "fixed") ? "fixed" : "open",
    devStatus: issues.every((i) => normalizeTrackStatus(i.devStatus) === "fixed") ? "fixed" : "open",
    finalStatus: issues.every((i) => normalizeFinalStatus(i.finalStatus) === "resolved")
      ? "resolved"
      : "open",
  };
}

export function canSetQaStatus(role) {
  return role === "qa" || role === "tester" || role === "super_admin";
}

export function canSetDevStatus(role, isAssignee) {
  if (role === "super_admin") return true;
  if (role === "developer") return isAssignee;
  return false;
}

export function canSetFinalStatus(role) {
  return role === "qa" || role === "tester" || role === "super_admin";
}

/** @deprecated — use track fields */
export function canSetStatus() {
  return true;
}

export function canSetInitialBugStatus() {
  return true;
}

export function statusAfterAssignees(assigneeIds, requestedStatus) {
  if (requestedStatus) return normalizeBugStatus(requestedStatus);
  return assigneeIds?.length ? "assigned" : "reported";
}

export function resolveListStatusFilter(status) {
  if (!status) return null;
  if (status === "open") {
    return {
      $or: [
        { finalStatus: "open" },
        { finalStatus: { $exists: false }, status: { $nin: CLOSED_BUG_STATUSES } },
      ],
    };
  }
  if (status === "resolved" || status === "closed") {
    return {
      $or: [{ finalStatus: "resolved" }, { status: { $in: CLOSED_BUG_STATUSES } }],
    };
  }
  return normalizeBugStatus(status);
}

export function isResolvedStatus(bugOrStatus) {
  if (typeof bugOrStatus === "string") {
    return normalizeBugStatus(bugOrStatus) === "closed";
  }
  return normalizeFinalStatus(bugOrStatus?.finalStatus) === "resolved";
}
