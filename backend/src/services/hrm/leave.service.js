import {
  leaveTypesTable,
  leaveBalancesTable,
  leaveRequestsTable,
  usersTable,
  notificationsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notifyUser, broadcast } from "../../lib/realtime.js";
import { conflict, notFound, badRequest, forbidden } from "../../utils/route-errors.js";
import { getHrmPolicyContext, countWorkingDays, getDayOfWeek, normalizeDateKey, workDayKeyForDate } from "./hrm-date-utils.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { companyHolidaysTable } from "../../models/schema/hrm/holidays.js";
import { wfhRequestsTable } from "../../models/schema/hrm/wfh.js";
import { runInTx } from "../../lib/db-tx.js";
import {
  allocateOldestFirst,
  ensureUserLeaveAccrualForPeriod,
  getLeaveYearForDate,
  reconcileAutoSeededBalance,
  reconcileUserLeaveBalances,
  syncUserLeaveAvailable,
} from "./leave-accrual.service.js";
import { getOrCreateSettings } from "../company-settings.js";
import { resolveWorkDayTimezone } from "../work-session-policy.js";
import {
  canUserReviewLeaveRequest,
  resolveLeaveNotifierIds,
  normalizeBalanceAllocations,
  buildBalanceTransitionOps,
} from "./leave-approval.js";

async function getHolidaySet(startDate, endDate) {
  const holidays = await companyHolidaysTable.find({
    date: { $gte: startDate, $lte: endDate },
  }).lean();
  return new Set(holidays.map((h) => h.date));
}

export function calculateLeaveDays(startDate, endDate, dayPart, weekendDays, holidayDates) {
  if (dayPart !== "full") {
    const single = startDate === endDate;
    if (!single) badRequest("Half-day or short leave must be a single date.");
    if (weekendDays.includes(getDayOfWeek(startDate))) return 0;
    if (holidayDates.has(startDate)) return 0;
    if (dayPart === "short") return 0.25;
    return 0.5;
  }
  return countWorkingDays(startDate, endDate, weekendDays, holidayDates);
}

async function ensureBalance(userId, leaveTypeId, year, session) {
  let query = leaveBalancesTable.findOne({ userId, leaveTypeId, year });
  if (session) query = query.session(session);
  let bal = await query;
  if (bal) {
    const type = await leaveTypesTable.findOne({ id: leaveTypeId }).lean();
    if (type) {
      bal = await reconcileAutoSeededBalance(bal, type);
    }
    return bal;
  }

  const type = await leaveTypesTable.findOne({ id: leaveTypeId }).lean();
  if (!type) notFound("Leave type");
  const id = await getNextSequence("leave_balances");
  const doc = {
    id,
    userId,
    leaveTypeId,
    year,
    // Accrual-only (Satyakabir model): balances grow via monthly EL credits, not upfront annual grants.
    allocated: 0,
    used: 0,
    pending: 0,
    carriedForward: 0,
    version: 0,
  };
  if (session) {
    const created = await leaveBalancesTable.create([doc], { session });
    return created[0];
  }
  return leaveBalancesTable.create(doc);
}

async function loadBalanceMap(userId, leaveYear, session) {
  const types = await leaveTypesTable.find({ status: "active" }).sort({ fifoPriority: 1 }).lean();

  // Bulk-load all existing balances for this user/year in one query.
  let existingQuery = leaveBalancesTable.find({
    userId,
    year: leaveYear,
    leaveTypeId: { $in: types.map((t) => t.id) },
  });
  if (session) existingQuery = existingQuery.session(session);
  const existingBalances = await existingQuery;
  const balByTypeId = new Map(existingBalances.map((b) => [b.leaveTypeId, b]));

  const map = new Map();
  for (const t of types) {
    let bal = balByTypeId.get(t.id);
    if (bal) {
      // Reconcile auto-seeded accruals reusing the already-fetched type doc.
      bal = await reconcileAutoSeededBalance(bal, t);
    } else {
      // Balance doesn't exist yet — create it (first-time only, rare path).
      bal = await ensureBalance(userId, t.id, leaveYear, session);
    }
    map.set(t.id, {
      allocated: bal.allocated ?? 0,
      carriedForward: bal.carriedForward ?? 0,
      used: bal.used ?? 0,
      pending: bal.pending ?? 0,
      balanceId: bal.id,
      version: bal.version ?? 0,
    });
  }
  return { types, map };
}

async function reserveAllocations(allocations, balanceMap, session) {
  const sessOpts = session ? { session } : {};
  for (const { leaveTypeId, days } of allocations) {
    const row = balanceMap.get(leaveTypeId);
    if (!row) notFound("Leave balance");
    const updated = await leaveBalancesTable.updateOne(
      { id: row.balanceId, version: row.version },
      { $inc: { pending: days, version: 1 } },
      sessOpts,
    );
    if (updated.modifiedCount !== 1) {
      conflict("Could not reserve leave balance — please retry.");
    }
    row.version += 1;
    row.pending += days;
  }
}

async function applyBalanceTransition(userId, leaveYear, request, mode, session) {
  const allocations = normalizeBalanceAllocations(request);
  if (!allocations.length) return;

  const sessOpts = session ? { session } : {};

  // Bulk-load all needed balances in one query instead of one findOne per allocation.
  const leaveTypeIds = allocations.map((a) => a.leaveTypeId);
  let bulkQuery = leaveBalancesTable.find({
    userId,
    leaveTypeId: { $in: leaveTypeIds },
    year: leaveYear,
  });
  if (session) bulkQuery = bulkQuery.session(session);
  const balances = await bulkQuery;
  const balByTypeId = new Map(balances.map((b) => [b.leaveTypeId, b]));

  const ops = [];
  for (const alloc of allocations) {
    const bal = balByTypeId.get(alloc.leaveTypeId);
    if (!bal) notFound("Leave balance");
    ops.push({
      leaveTypeId: alloc.leaveTypeId,
      days: alloc.days,
      balanceId: bal.id,
      version: bal.version,
    });
  }

  for (const { filter, update } of buildBalanceTransitionOps(ops, mode)) {
    const result = await leaveBalancesTable.updateOne(filter, update, sessOpts);
    if (result.modifiedCount !== 1) {
      conflict("Leave balance update conflict — please retry.");
    }
  }
}

export async function listLeaveTypes() {
  return leaveTypesTable.find({ status: "active" }).sort({ fifoPriority: 1 }).lean();
}

export async function listLeaveBalances(userId, year) {
  const settings = await getOrCreateSettings();
  const tz = resolveWorkDayTimezone(settings.complianceTimezone);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [cy, cm] = fmt.format(now).split("-").map(Number);
  const startMonth = settings.hrmLeaveYearStartMonth ?? 1;
  const y = year != null ? getLeaveYearForDate(year, cm, startMonth) : getLeaveYearForDate(cy, cm, startMonth);

  await ensureUserLeaveAccrualForPeriod(userId);
  await reconcileUserLeaveBalances(userId, y);
  const types = await listLeaveTypes();
  const result = [];
  for (const t of types) {
    const bal = await ensureBalance(userId, t.id, y);
    result.push({
      leaveType: t,
      ...bal.toObject(),
      available: Math.max(0, bal.allocated + bal.carriedForward - bal.used - bal.pending),
    });
  }
  return result;
}

export async function listLeaveRequests({ userIds, status, date } = {}) {
  const query = {};
  if (userIds?.length) query.userId = { $in: userIds };
  if (status) query.status = status;
  if (date) {
    query.startDate = { $lte: date };
    query.endDate = { $gte: date };
  }
  const rows = await leaveRequestsTable.find(query).sort({ createdAt: -1 }).lean();
  const userIdsSet = [...new Set(rows.map((r) => r.userId))];
  const users = await usersTable.find({ id: { $in: userIdsSet } }, { id: 1, name: 1, employeeId: 1 }).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  const types = await leaveTypesTable.find().lean();
  const typeMap = new Map(types.map((t) => [t.id, t]));
  return rows.map((r) => ({
    ...r,
    userName: userMap.get(r.userId)?.name ?? "Unknown",
    employeeId: userMap.get(r.userId)?.employeeId ?? null,
    leaveType: typeMap.get(r.leaveTypeId) ?? null,
    leaveTypeName: typeMap.get(r.leaveTypeId)?.name ?? null,
  }));
}

export async function applyLeaveRequest(userId, body, actorId) {
  const { leaveTypeId, dayPart = "full", reason } = body;
  const startDate = normalizeDateKey(body.startDate);
  const endDate = normalizeDateKey(body.endDate ?? body.startDate);
  if (!leaveTypeId) badRequest("leaveTypeId is required.");
  if (!startDate || !endDate) badRequest("Valid startDate and endDate are required.");
  if (endDate < startDate) badRequest("endDate must be on or after startDate.");
  if (!reason?.trim()) badRequest("Reason is required.");

  const { weekendDays, settings, timezone } = await getHrmPolicyContext();
  const todayKey = workDayKeyForDate(new Date(), timezone);
  if (startDate < todayKey) {
    badRequest("Leave cannot be applied for past dates.", "startDate");
  }

  const type = await leaveTypesTable.findOne({ id: leaveTypeId, status: "active" }).lean();
  if (!type) notFound("Leave type");

  const holidays = await getHolidaySet(startDate, endDate);
  const days = calculateLeaveDays(startDate, endDate, dayPart, weekendDays, holidays);
  if (days <= 0) badRequest("No working days in selected range.");

  const overlapping = await leaveRequestsTable.findOne({
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (overlapping) conflict("Leave overlaps with an existing request.");

  const wfhOverlap = await wfhRequestsTable.findOne({
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (wfhOverlap) conflict("Dates overlap with a WFH request.");

  const startMonth = parseInt(startDate.slice(5, 7), 10);
  const startYear = parseInt(startDate.slice(0, 4), 10);
  const leaveYear = getLeaveYearForDate(startYear, startMonth, settings.hrmLeaveYearStartMonth ?? 1);

  const id = await getNextSequence("leave_requests");

  const request = await runInTx(async (session) => {
    const { types, map } = await loadBalanceMap(userId, leaveYear, session);
    const { allocations, unpaidDays } = allocateOldestFirst(types, map, days);

    await reserveAllocations(allocations, map, session);

    const doc = {
      id,
      userId,
      leaveTypeId,
      startDate,
      endDate,
      dayPart,
      days,
      lopDays: unpaidDays,
      balanceAllocations: allocations.map(({ leaveTypeId: ltId, days: d }) => ({
        leaveTypeId: ltId,
        days: d,
      })),
      reason: reason.trim(),
      status: "pending",
    };

    if (session) {
      const created = await leaveRequestsTable.create([doc], { session });
      return created[0];
    }
    return leaveRequestsTable.create(doc);
  });

  await notifyApprovers(userId, request, "New leave request");
  await syncUserLeaveAvailable(userId, leaveYear);
  await logHrmAudit({
    actorId: actorId ?? userId,
    action: "leave_applied",
    entityType: "leave_request",
    entityId: id,
    newVal: request.toObject?.() ?? request,
  });

  return request;
}

async function notifyApprovers(userId, request, title) {
  const requester = await usersTable.findOne({ id: userId }, { name: 1, reportingManagerId: 1 }).lean();
  const hrAdmins = await usersTable.find(
    { role: { $in: ["super_admin", "hr"] }, status: "active" },
    { id: 1 },
  ).lean();
  const approverIds = resolveLeaveNotifierIds(requester, hrAdmins.map((u) => u.id));

  for (const approverId of approverIds) {
    const notifId = await getNextSequence("notifications");
    await notificationsTable.create({
      id: notifId,
      userId: approverId,
      type: "hrm_leave",
      title,
      body: `${requester?.name ?? "Employee"} requested leave (${request.startDate} – ${request.endDate})`,
      entityType: "leave_request",
      entityId: request.id,
      isRead: false,
    });
    notifyUser(approverId, "notification", { type: "hrm_leave", title });
  }
  broadcast("hrm_leave_updated", { id: request.id });
}

export async function assertCanReviewLeaveRequest(reviewer, requestUserId) {
  const requester = await usersTable
    .findOne({ id: requestUserId }, { id: 1, reportingManagerId: 1 })
    .lean();
  if (!requester) notFound("Employee");
  if (!canUserReviewLeaveRequest(reviewer, requester)) {
    forbidden("You are not authorized to approve this leave request.");
  }
}

export async function reviewLeaveRequest(id, { status, reviewNote }, reviewerId) {
  const req = await leaveRequestsTable.findOne({ id });
  if (!req) notFound("Leave request");
  if (req.status !== "pending") conflict("Request is not pending.");

  const reviewer = await usersTable.findOne({ id: reviewerId }, { id: 1, role: 1 }).lean();
  if (!reviewer) notFound("Reviewer");
  if (reviewerId === req.userId) conflict("You cannot approve your own leave.");
  await assertCanReviewLeaveRequest(reviewer, req.userId);

  if (!["approved", "rejected", "cancelled"].includes(status)) {
    badRequest("Invalid review status.");
  }

  const startMonth = parseInt(req.startDate.slice(5, 7), 10);
  const startYear = parseInt(req.startDate.slice(0, 4), 10);
  const { settings } = await getHrmPolicyContext();
  const leaveYear = getLeaveYearForDate(startYear, startMonth, settings.hrmLeaveYearStartMonth ?? 1);

  const updated = await runInTx(async (session) => {
    if (status === "approved") {
      await applyBalanceTransition(req.userId, leaveYear, req, "approve", session);
    } else if (status === "rejected" || status === "cancelled") {
      await applyBalanceTransition(req.userId, leaveYear, req, "release", session);
    }

    let query = leaveRequestsTable.findOneAndUpdate(
      { id, status: "pending" },
      {
        $set: {
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        },
      },
      { new: true },
    );
    if (session) query = query.session(session);
    const row = await query;
    if (!row) conflict("Leave request is no longer pending.");
    return row;
  });

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: req.userId,
    type: "hrm_leave",
    title: `Leave ${status}`,
    body: `Your leave request (${req.startDate} – ${req.endDate}) was ${status}.`,
    entityType: "leave_request",
    entityId: id,
    isRead: false,
  });
  notifyUser(req.userId, "notification", { type: "hrm_leave", title: `Leave ${status}` });
  broadcast("hrm_leave_updated", { id });

  await syncUserLeaveAvailable(req.userId, leaveYear);

  await logHrmAudit({
    actorId: reviewerId,
    action: `leave_${status}`,
    entityType: "leave_request",
    entityId: id,
    severity: status === "approved" ? "info" : "warning",
    newVal: updated.toObject(),
  });

  return updated;
}

export async function cancelLeaveRequest(id, userId) {
  const req = await leaveRequestsTable.findOne({ id });
  if (!req) notFound("Leave request");
  if (req.userId !== userId) forbidden("You can only cancel your own leave requests.");
  if (req.status !== "pending") conflict("Only pending requests can be cancelled.");

  const startMonth = parseInt(req.startDate.slice(5, 7), 10);
  const startYear = parseInt(req.startDate.slice(0, 4), 10);
  const { settings } = await getHrmPolicyContext();
  const leaveYear = getLeaveYearForDate(startYear, startMonth, settings.hrmLeaveYearStartMonth ?? 1);

  const updated = await runInTx(async (session) => {
    await applyBalanceTransition(req.userId, leaveYear, req, "release", session);

    let query = leaveRequestsTable.findOneAndUpdate(
      { id, status: "pending", userId },
      {
        $set: {
          status: "cancelled",
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );
    if (session) query = query.session(session);
    const row = await query;
    if (!row) conflict("Leave request is no longer pending.");
    return row;
  });

  await logHrmAudit({
    actorId: userId,
    action: "leave_cancelled",
    entityType: "leave_request",
    entityId: id,
    severity: "info",
    newVal: updated.toObject(),
  });

  broadcast("hrm_leave_updated", { id });
  await syncUserLeaveAvailable(userId, leaveYear);
  return updated;
}

export async function seedLeaveTypes() {
  const defaults = [
    { name: "Casual Leave", code: "CL", maxDaysPerYear: 12, fifoPriority: 1 },
    { name: "Sick Leave", code: "SL", maxDaysPerYear: 10, fifoPriority: 2 },
    { name: "Earned Leave", code: "EL", maxDaysPerYear: 15, fifoPriority: 0, carryForwardAllowed: true },
    { name: "Unpaid Leave", code: "UL", maxDaysPerYear: 30, isPaid: false, fifoPriority: 99 },
  ];
  for (const d of defaults) {
    const exists = await leaveTypesTable.findOne({ code: d.code }).lean();
    if (exists) continue;
    const id = await getNextSequence("leave_types");
    await leaveTypesTable.create({ id, isPaid: true, requiresApproval: true, status: "active", ...d });
  }
}

export {
  canUserReviewLeaveRequest,
  resolveLeaveNotifierIds,
  normalizeBalanceAllocations,
  buildBalanceTransitionOps,
} from "./leave-approval.js";
