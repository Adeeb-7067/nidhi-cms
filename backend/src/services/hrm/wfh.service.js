import {
  wfhRequestsTable,
  usersTable,
  notificationsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { leaveRequestsTable } from "../../models/schema/hrm/leave.js";
import { notifyUser, broadcast } from "../../lib/realtime.js";
import { conflict, notFound, badRequest, forbidden } from "../../utils/route-errors.js";
import { eachDateInRange, getHrmPolicyContext, normalizeDateKey } from "./hrm-date-utils.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { canUserReviewLeaveRequest, resolveLeaveNotifierIds } from "./leave-approval.js";

async function notifyWfhApprovers(userId, request, title) {
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
      type: "hrm_wfh",
      title,
      body: `${requester?.name ?? "Employee"} requested WFH (${request.startDate} – ${request.endDate})`,
      entityType: "wfh_request",
      entityId: request.id,
      isRead: false,
    });
    notifyUser(approverId, "notification", { type: "hrm_wfh", title });
  }
  broadcast("hrm_wfh_updated", { id: request.id });
}

export async function listWfhRequests({ userIds, status } = {}) {
  const query = {};
  if (userIds?.length) query.userId = { $in: userIds };
  if (status) query.status = status;
  const rows = await wfhRequestsTable.find(query).sort({ createdAt: -1 }).lean();
  const users = await usersTable.find({ id: { $in: [...new Set(rows.map((r) => r.userId))] } }, { id: 1, name: 1, employeeId: 1, avatarUrl: 1 }).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    userName: userMap.get(r.userId)?.name ?? "Unknown",
    employeeId: userMap.get(r.userId)?.employeeId ?? null,
    avatarUrl: userMap.get(r.userId)?.avatarUrl ?? null,
  }));
}

export async function applyWfhRequest(userId, body, actorId) {
  const startDate = normalizeDateKey(body.startDate ?? body.date);
  const endDate = normalizeDateKey(body.endDate ?? body.startDate ?? body.date);
  const { reason, phoneNumber } = body;
  if (!startDate || !endDate) badRequest("Valid startDate is required.");
  if (endDate < startDate) badRequest("endDate must be on or after startDate.");
  if (!reason?.trim()) badRequest("Reason is required.");

  const days = eachDateInRange(startDate, endDate).length;
  const user = await usersTable.findOne({ id: userId }).lean();
  const limit = user?.wfhMonthlyLimit ?? 4;
  const month = startDate.slice(0, 7);
  const monthRequests = await wfhRequestsTable.find({
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $regex: `^${month}` },
  }).lean();
  const used = monthRequests.reduce((s, r) => s + (r.days ?? 1), 0);
  if (used + days > limit) conflict(`WFH monthly limit exceeded (${limit} days).`);

  const leaveOverlap = await leaveRequestsTable.findOne({
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (leaveOverlap) conflict("Dates overlap with leave request.");

  const wfhOverlap = await wfhRequestsTable.findOne({
    userId,
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  if (wfhOverlap) conflict("Dates overlap with an existing WFH request.");

  const id = await getNextSequence("wfh_requests");
  const { settings } = await getHrmPolicyContext();
  const globalWfhMode = settings.hrmGlobalWfhMode === true;

  const request = await wfhRequestsTable.create({
    id,
    userId,
    startDate,
    endDate,
    days,
    reason: reason.trim(),
    phoneNumber: phoneNumber?.trim() || null,
    status: globalWfhMode ? "approved" : "pending",
    reviewedBy: globalWfhMode ? (actorId ?? userId) : null,
    reviewedAt: globalWfhMode ? new Date() : null,
    reviewNote: globalWfhMode ? "Auto-approved (company-wide WFH mode)" : null,
  });

  await logHrmAudit({
    actorId: actorId ?? userId,
    action: globalWfhMode ? "wfh_auto_approved_global" : "wfh_applied",
    entityType: "wfh_request",
    entityId: id,
    newVal: request.toObject(),
  });

  if (globalWfhMode) {
    const notifId = await getNextSequence("notifications");
    await notificationsTable.create({
      id: notifId,
      userId,
      type: "hrm_wfh",
      title: "WFH approved",
      body: `Your WFH (${startDate} – ${endDate}) was auto-approved — company-wide WFH is active. Clock in to mark attendance.`,
      entityType: "wfh_request",
      entityId: id,
      isRead: false,
    });
    notifyUser(userId, "notification", { type: "hrm_wfh", title: "WFH approved" });
    broadcast("hrm_wfh_updated", { id });
    return request;
  }

  await notifyWfhApprovers(userId, request, "New WFH request");
  return request;
}

export async function assertCanReviewWfhRequest(reviewer, requestUserId) {
  const requester = await usersTable
    .findOne({ id: requestUserId }, { id: 1, reportingManagerId: 1 })
    .lean();
  if (!requester) notFound("Employee");
  if (!canUserReviewLeaveRequest(reviewer, requester)) {
    forbidden("You are not authorized to approve this WFH request.");
  }
}

export async function reviewWfhRequest(id, { status, reviewNote }, reviewerId) {
  const req = await wfhRequestsTable.findOne({ id });
  if (!req) notFound("WFH request");
  if (req.status !== "pending") conflict("Request is not pending.");
  if (reviewerId === req.userId) conflict("You cannot approve your own WFH request.");

  const reviewer = await usersTable.findOne({ id: reviewerId }, { id: 1, role: 1 }).lean();
  if (!reviewer) notFound("Reviewer");
  await assertCanReviewWfhRequest(reviewer, req.userId);
  if (!["approved", "rejected", "cancelled"].includes(status)) {
    badRequest("Invalid review status.");
  }

  const updated = await wfhRequestsTable.findOneAndUpdate(
    { id, status: "pending" },
    { $set: { status, reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: reviewNote ?? null } },
    { new: true },
  );
  if (!updated) conflict("WFH request is no longer pending.");

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: req.userId,
    type: "hrm_wfh",
    title: `WFH ${status}`,
    body: `Your WFH request (${req.startDate} – ${req.endDate}) was ${status}.`,
    entityType: "wfh_request",
    entityId: id,
    isRead: false,
  });
  notifyUser(req.userId, "notification", { type: "hrm_wfh", title: `WFH ${status}` });
  broadcast("hrm_wfh_updated", { id });

  await logHrmAudit({
    actorId: reviewerId,
    action: `wfh_${status}`,
    entityType: "wfh_request",
    entityId: id,
    newVal: updated.toObject(),
  });

  return updated;
}

export async function cancelWfhRequest(id, userId) {
  const req = await wfhRequestsTable.findOne({ id });
  if (!req) notFound("WFH request");
  if (req.userId !== userId) forbidden("You can only cancel your own WFH requests.");
  if (req.status !== "pending") conflict("Only pending requests can be cancelled.");

  const updated = await wfhRequestsTable.findOneAndUpdate(
    { id, status: "pending", userId },
    { $set: { status: "cancelled", reviewedBy: userId, reviewedAt: new Date() } },
    { new: true },
  );
  if (!updated) conflict("WFH request is no longer pending.");

  await logHrmAudit({
    actorId: userId,
    action: "wfh_cancelled",
    entityType: "wfh_request",
    entityId: id,
    severity: "info",
    newVal: updated.toObject(),
  });

  broadcast("hrm_wfh_updated", { id });
  return updated;
}
