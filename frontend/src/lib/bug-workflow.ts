import type { BugStatus } from "@/api";

export type TrackStatus = "open" | "fixed";
export type FinalStatus = "open" | "resolved";

export const TRACK_OPEN: TrackStatus = "open";
export const TRACK_FIXED: TrackStatus = "fixed";
export const FINAL_OPEN: FinalStatus = "open";
export const FINAL_RESOLVED: FinalStatus = "resolved";

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  open: "Not fixed",
  fixed: "Fixed",
};

export const FINAL_STATUS_LABELS: Record<FinalStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

export function normalizeTrackStatus(v?: string | null): TrackStatus {
  return v === "fixed" ? "fixed" : "open";
}

export function normalizeFinalStatus(v?: string | null): FinalStatus {
  return v === "resolved" ? "resolved" : "open";
}

/** Legacy workflow statuses (list filters / badges) */
export const BUG_STATUSES = [
  "reported",
  "assigned",
  "in_progress",
  "fixed",
  "pending_qa_verification",
  "reopened",
  "closed",
] as const;

export type WorkflowBugStatus = (typeof BUG_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, WorkflowBugStatus> = {
  open: "reported",
  verified: "closed",
  wont_fix: "closed",
  duplicate: "closed",
};

export function normalizeBugStatus(status: string | undefined | null): WorkflowBugStatus {
  if (!status) return "reported";
  return (LEGACY_STATUS_MAP[status] ?? status) as WorkflowBugStatus;
}

export const BUG_STATUS_LABELS: Record<WorkflowBugStatus, string> = {
  reported: "Reported",
  assigned: "Assigned",
  in_progress: "In Progress",
  fixed: "Fixed",
  pending_qa_verification: "Pending QA",
  reopened: "Reopened",
  closed: "Closed",
};

export const BUG_STATUS_COLORS: Record<WorkflowBugStatus, string> = {
  reported: "text-slate-600 border-slate-400/40 bg-slate-500/10",
  assigned: "text-blue-600 border-blue-500/40 bg-blue-500/10",
  in_progress: "text-orange-600 border-orange-500/40 bg-orange-500/10",
  fixed: "text-green-600 border-green-500/40 bg-green-500/10",
  pending_qa_verification: "text-purple-600 border-purple-500/40 bg-purple-500/10",
  reopened: "text-red-600 border-red-500/40 bg-red-500/10",
  closed: "text-emerald-700 border-emerald-500/40 bg-emerald-500/10",
};

export function canSetQaStatus(role?: string) {
  return role === "qa" || role === "tester" || role === "super_admin";
}

export function canSetDevStatus(role?: string, isAssignee?: boolean) {
  if (role === "super_admin") return true;
  if (role === "developer") return !!isAssignee;
  return false;
}

export function canSetFinalStatus(role?: string) {
  return role === "qa" || role === "tester" || role === "super_admin";
}

export function formatBugStatusLabel(status: string): string {
  return BUG_STATUS_LABELS[normalizeBugStatus(status)] ?? status;
}

export const PRIORITY_LABELS: Record<string, string> = {
  p1: "P1 · Critical",
  p2: "P2 · High",
  p3: "P3 · Normal",
  p4: "P4 · Low",
};

export function formatUserRole(role: string | null | undefined): string {
  if (!role) return "User";
  if (role === "qa" || role === "tester") return "QA";
  if (role === "developer") return "Developer";
  if (role === "super_admin") return "Admin";
  return role.replace(/_/g, " ");
}

export function isOpenBugStatus(status: string): boolean {
  return normalizeBugStatus(status) !== "closed";
}

export function bugStatsFromList(bugs: { finalStatus?: string; status: BugStatus | string }[]) {
  const normalized = bugs.map((b) => ({
    final: normalizeFinalStatus(b.finalStatus),
    legacy: normalizeBugStatus(b.status),
  }));
  return {
    total: bugs.length,
    open: normalized.filter((s) => s.final !== "resolved" && s.legacy !== "closed").length,
    inProgress: normalized.filter((s) => s.legacy === "in_progress" || s.legacy === "assigned").length,
    awaitingQa: normalized.filter(
      (s) => s.legacy === "pending_qa_verification" || s.legacy === "fixed",
    ).length,
    closed: normalized.filter((s) => s.final === "resolved" || s.legacy === "closed").length,
  };
}

export function canUserModifyBug(
  role: string | undefined,
  userId: number | undefined,
  bug: { reporterId: number; assigneeId?: number | null; assigneeIds?: number[] },
): boolean {
  if (!role || userId == null) return false;
  if (role === "super_admin" || role === "tester" || role === "qa") return true;
  if (role === "developer") {
    return (
      bug.assigneeId === userId ||
      (Array.isArray(bug.assigneeIds) && bug.assigneeIds.includes(userId))
    );
  }
  return false;
}

export function isBugReporter(bug: { reporterId: number }, userId: number | undefined): boolean {
  return userId != null && bug.reporterId === userId;
}

export type BugIssueView = {
  issueKey?: string;
  title: string;
  qaStatus?: string;
  devStatus?: string;
  finalStatus?: string;
  id?: number;
};
