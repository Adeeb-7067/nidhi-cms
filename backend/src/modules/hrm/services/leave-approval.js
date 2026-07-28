import { isHrmAdminRole } from "../../../constants/user-roles.js";

/**
 * Who may approve/reject a pending leave request.
 *
 * Rule (Stage 2 decision #3):
 *   - HR / super_admin may act on any request (override).
 *   - When the requester has a reportingManagerId, that manager may act (final).
 *   - When there is no reporting manager, only HR / super_admin may act.
 */
export function canUserReviewLeaveRequest(reviewer, requester) {
  if (!reviewer?.id || !requester?.id) return false;
  if (reviewer.id === requester.id) return false;
  if (isHrmAdminRole(reviewer.role)) return true;
  if (requester.reportingManagerId && reviewer.id === requester.reportingManagerId) {
    return true;
  }
  return false;
}

/** User ids to notify when a new leave request is submitted. */
export function resolveLeaveNotifierIds(requester, hrAdminIds = []) {
  const ids = new Set();
  if (requester?.reportingManagerId) {
    ids.add(requester.reportingManagerId);
  }
  for (const id of hrAdminIds) {
    if (id != null) ids.add(id);
  }
  if (requester?.id != null) ids.delete(requester.id);
  return [...ids];
}

/** Normalize stored allocations; legacy rows fall back to the single leaveTypeId. */
export function normalizeBalanceAllocations(request) {
  if (Array.isArray(request.balanceAllocations)) {
    if (request.balanceAllocations.length === 0) return [];
    return request.balanceAllocations.map(({ leaveTypeId, days }) => ({
      leaveTypeId,
      days: Number(days),
    }));
  }
  if (request.leaveTypeId != null && request.days > 0) {
    return [{ leaveTypeId: request.leaveTypeId, days: request.days }];
  }
  return [];
}

/**
 * Build guarded Mongo update filters for pending → used (approve) or pending release (reject).
 * Returns an array of { filter, update } pairs — one per allocation row.
 */
export function buildBalanceTransitionOps(allocations, mode) {
  if (mode !== "approve" && mode !== "release") {
    throw new Error(`Unknown balance transition mode: ${mode}`);
  }
  return allocations.map(({ leaveTypeId, days, balanceId, version }) => {
    const d = Number(days);
    const filter = {
      id: balanceId,
      version,
      pending: { $gte: d },
    };
    const update =
      mode === "approve"
        ? { $inc: { pending: -d, used: d, version: 1 } }
        : { $inc: { pending: -d, version: 1 } };
    return { leaveTypeId, days: d, filter, update };
  });
}
