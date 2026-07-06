import {
  hrmExitRequestsTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notFound, badRequest, conflict } from "../../utils/route-errors.js";
import {
  EXIT_WORKFLOW_STAGES,
  exitRequestStatuses,
} from "../../constants/hrm-workflow.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { logHrmAudit } from "./hrm-audit.service.js";
import { listAssetsForUser, returnAssetsForUser } from "./assets.service.js";
import { evictUserFromAuthCache } from "../../middlewares/auth.js";

const MS_PER_DAY = 86400000;
const DEFAULT_EXIT_NOTICE_DAYS = 30;

function startOfUtcDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(date, days) {
  return new Date(startOfUtcDay(date).getTime() + Math.max(0, Number(days) || 0) * MS_PER_DAY);
}

function parseNoticePeriodDays(rawValue) {
  if (rawValue == null || rawValue === "") return DEFAULT_EXIT_NOTICE_DAYS;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 0) {
    badRequest("Notice period days must be a non-negative whole number.");
  }
  return value;
}

export function computeNoticeDaysRemaining(lastWorkingDay) {
  if (!lastWorkingDay) return 0;
  const today = startOfUtcDay(new Date());
  const lwd = startOfUtcDay(lastWorkingDay);
  const diff = Math.round((lwd.getTime() - today.getTime()) / MS_PER_DAY);
  return Math.max(0, diff);
}

/** True when today is strictly after the employee's last working day (UTC). */
export function isExitDeactivationDue(lastWorkingDay, asOf = new Date()) {
  if (!lastWorkingDay) return false;
  const today = startOfUtcDay(asOf);
  const lwd = startOfUtcDay(lastWorkingDay);
  return today.getTime() > lwd.getTime();
}

async function loadEmployeeBrief(userId) {
  return usersTable
    .findOne(
      { id: userId },
      {
        id: 1,
        name: 1,
        email: 1,
        employeeId: 1,
        designation: 1,
        avatarUrl: 1,
        departmentId: 1,
        department: 1,
        status: 1,
        hrEmploymentStatus: 1,
      },
    )
    .lean();
}

async function mapExitRequest(row, { includeAssets = false } = {}) {
  const employee = await loadEmployeeBrief(row.userId);
  const noticeDaysRemaining = computeNoticeDaysRemaining(row.lastWorkingDay);
  let assignedAssetCount = 0;
  if (includeAssets) {
    const assets = await listAssetsForUser(row.userId);
    assignedAssetCount = assets.length;
  }
  return {
    id: row.id,
    userId: row.userId,
    employeeName: employee?.name ?? "Unknown",
    employeeEmail: employee?.email ?? null,
    employeeCode: employee?.employeeId ?? null,
    employeeDesignation: employee?.designation ?? null,
    employeeAvatarUrl: employee?.avatarUrl ?? null,
    employeeDepartment: employee?.department ?? null,
    reason: row.reason,
    resignationDate: row.resignationDate,
    lastWorkingDay: row.lastWorkingDay,
    noticePeriodDays: Number(row.noticePeriodDays ?? DEFAULT_EXIT_NOTICE_DAYS),
    stage: row.stage ?? 1,
    stageLabel: EXIT_WORKFLOW_STAGES[(row.stage ?? 1) - 1] ?? EXIT_WORKFLOW_STAGES[0],
    stageCount: EXIT_WORKFLOW_STAGES.length,
    status: row.status ?? "active",
    approvalStatus: row.approvalStatus ?? "pending",
    approvedAt: row.approvedAt ?? null,
    approvedByUserId: row.approvedByUserId ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectedByUserId: row.rejectedByUserId ?? null,
    rejectionReason: row.rejectionReason ?? "",
    autoDeactivatedAt: row.autoDeactivatedAt ?? null,
    employeeStatus: employee?.status ?? null,
    assetReturnComplete: Boolean(row.assetReturnComplete),
    fnfSettled: Boolean(row.fnfSettled),
    noticeDaysRemaining,
    deactivationDue: isExitDeactivationDue(row.lastWorkingDay),
    assignedAssetCount,
    notes: row.notes ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listExitRequests({ status, approvalStatus } = {}) {
  const query = {};
  if (status && exitRequestStatuses.includes(status)) {
    query.status = status;
  } else {
    query.status = "active";
  }
  if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
    query.approvalStatus = approvalStatus;
  }
  const rows = await hrmExitRequestsTable.find(query).sort({ lastWorkingDay: 1 }).lean();
  return Promise.all(rows.map((row) => mapExitRequest(row, { includeAssets: true })));
}

export async function getExitRequest(id) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  const record = await mapExitRequest(row, { includeAssets: true });
  const assets = await listAssetsForUser(row.userId);
  return { ...record, assets };
}

export async function createExitRequest(body, actorId = null) {
  const userId = Number(body.userId);
  if (!userId) badRequest("userId is required.");

  const employee = await usersTable
    .findOne({ id: userId, role: { $in: hrmEmployeeRoles } })
    .lean();
  if (!employee) notFound("Employee");
  if (employee.status !== "active") badRequest("Exit workflow can only start for active employees.");

  const existing = await hrmExitRequestsTable.findOne({ userId, status: "active" }).lean();
  if (existing) conflict("An active exit request already exists for this employee.");

  const reason = String(body.reason ?? "").trim();
  if (!reason) badRequest("Reason is required.");

  const resignationDate = body.resignationDate ? new Date(body.resignationDate) : null;
  if (!resignationDate || Number.isNaN(resignationDate.getTime())) {
    badRequest("Valid resignation date is required.");
  }
  const noticePeriodDays = parseNoticePeriodDays(body.noticePeriodDays);
  const lastWorkingDay = body.lastWorkingDay
    ? new Date(body.lastWorkingDay)
    : addUtcDays(resignationDate, noticePeriodDays);
  if (Number.isNaN(lastWorkingDay.getTime())) badRequest("Valid last working day is required.");
  if (lastWorkingDay < resignationDate) {
    badRequest("Last working day must be on or after resignation date.");
  }

  const id = await getNextSequence("hrm_exit_requests");
  const record = await hrmExitRequestsTable.create({
    id,
    userId,
    reason,
    resignationDate,
    lastWorkingDay,
    noticePeriodDays,
    stage: 1,
    status: "active",
    approvalStatus: "pending",
    notes: String(body.notes ?? "").trim(),
  });

  await logHrmAudit({
    actorId,
    action: "exit_started",
    entityType: "hrm_exit",
    entityId: id,
    severity: "info",
    metadata: { userId, reason, noticePeriodDays },
  });

  return mapExitRequest(record.toObject(), { includeAssets: true });
}

async function finalizeEmployeeExit(userId, lastWorkingDay) {
  await usersTable.updateOne(
    { id: userId },
    {
      $set: {
        status: "inactive",
        hrEmploymentStatus: "Resigned",
        exitDate: lastWorkingDay,
      },
    },
  );
  evictUserFromAuthCache(userId);
}

async function tryDeactivateExitRequest(row, actorId = null, auditAction = "exit_auto_deactivated") {
  if ((row.approvalStatus ?? "pending") !== "approved") return row;
  if (row.autoDeactivatedAt) return row;
  if (row.status === "cancelled") return row;
  if (!isExitDeactivationDue(row.lastWorkingDay)) return row;

  await finalizeEmployeeExit(row.userId, row.lastWorkingDay);
  const updated = await hrmExitRequestsTable
    .findOneAndUpdate(
      { id: row.id },
      {
        $set: {
          autoDeactivatedAt: new Date(),
          status: "completed",
          stage: EXIT_WORKFLOW_STAGES.length,
        },
      },
      { new: true },
    )
    .lean();

  await logHrmAudit({
    actorId,
    action: auditAction,
    entityType: "hrm_exit",
    entityId: row.id,
    severity: "warning",
    metadata: { userId: row.userId, lastWorkingDay: row.lastWorkingDay },
  });

  return updated;
}

export async function autoDeactivateDueEmployees(actorId = null) {
  const today = startOfUtcDay(new Date());
  const dueRequests = await hrmExitRequestsTable.find({
    approvalStatus: "approved",
    status: { $ne: "cancelled" },
    lastWorkingDay: { $lt: today },
    autoDeactivatedAt: null,
  }).lean();
  if (!dueRequests.length) return { processed: 0 };

  let processed = 0;
  for (const row of dueRequests) {
    const updated = await tryDeactivateExitRequest(row, actorId);
    if (updated?.autoDeactivatedAt) processed += 1;
  }

  return { processed };
}

export async function updateExitRequest(id, body, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be updated.");

  const update = {};
  if (body.reason != null) {
    const reason = String(body.reason).trim();
    if (!reason) badRequest("Reason cannot be empty.");
    update.reason = reason;
  }
  if (body.notes != null) update.notes = String(body.notes).trim();
  if (body.noticePeriodDays != null) {
    update.noticePeriodDays = parseNoticePeriodDays(body.noticePeriodDays);
  }
  if (body.resignationDate != null) {
    const resignationDate = new Date(body.resignationDate);
    if (Number.isNaN(resignationDate.getTime())) badRequest("Invalid resignation date.");
    update.resignationDate = resignationDate;
  }
  if (body.lastWorkingDay != null && body.lastWorkingDay !== "") {
    const lastWorkingDay = new Date(body.lastWorkingDay);
    if (Number.isNaN(lastWorkingDay.getTime())) badRequest("Invalid last working day.");
    update.lastWorkingDay = lastWorkingDay;
  } else if (
    update.resignationDate != null ||
    update.noticePeriodDays != null
  ) {
    const effectiveResignationDate = update.resignationDate ?? row.resignationDate;
    const effectiveNoticePeriodDays = update.noticePeriodDays ?? row.noticePeriodDays ?? DEFAULT_EXIT_NOTICE_DAYS;
    update.lastWorkingDay = addUtcDays(effectiveResignationDate, effectiveNoticePeriodDays);
  }
  if (body.fnfSettled != null) update.fnfSettled = Boolean(body.fnfSettled);
  if (body.assetReturnComplete != null) update.assetReturnComplete = Boolean(body.assetReturnComplete);

  if (body.stage != null) {
    const stage = Number(body.stage);
    if (!Number.isInteger(stage) || stage < 1 || stage > EXIT_WORKFLOW_STAGES.length) {
      badRequest("Invalid workflow stage.");
    }
    update.stage = stage;
  }

  const resignationDate = update.resignationDate ?? row.resignationDate;
  const lastWorkingDay = update.lastWorkingDay ?? row.lastWorkingDay;
  if (lastWorkingDay < resignationDate) {
    badRequest("Last working day must be on or after resignation date.");
  }

  let completeExit = false;
  if (body.complete === true || body.status === "completed") {
    if ((row.approvalStatus ?? "pending") !== "approved") {
      badRequest("Approve the exit request before completing it.");
    }
    update.stage = EXIT_WORKFLOW_STAGES.length;
    if (isExitDeactivationDue(lastWorkingDay)) {
      update.status = "completed";
    }
    completeExit = true;
  }

  if (!Object.keys(update).length) badRequest("No exit fields to update.");

  let updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  if (completeExit) {
    updated = (await tryDeactivateExitRequest(updated, actorId, "exit_completed")) ?? updated;
  }

  await logHrmAudit({
    actorId,
    action: completeExit && updated.autoDeactivatedAt ? "exit_completed" : "exit_updated",
    entityType: "hrm_exit",
    entityId: id,
    severity: completeExit && updated.autoDeactivatedAt ? "warning" : "info",
    metadata: { fields: Object.keys(update), userId: updated.userId },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function approveExitRequest(id, body = {}, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be approved.");
  if ((row.approvalStatus ?? "pending") !== "pending") {
    badRequest("Exit request is not pending approval.");
  }

  const update = {
    approvalStatus: "approved",
    approvedAt: new Date(),
    approvedByUserId: actorId ?? null,
    rejectedAt: null,
    rejectedByUserId: null,
    rejectionReason: "",
    stage: Math.max(row.stage ?? 1, 2),
  };

  if (body.lastWorkingDay != null && body.lastWorkingDay !== "") {
    const lastWorkingDay = new Date(body.lastWorkingDay);
    if (Number.isNaN(lastWorkingDay.getTime())) badRequest("Invalid last working day.");
    if (lastWorkingDay < row.resignationDate) {
      badRequest("Last working day must be on or after resignation date.");
    }
    update.lastWorkingDay = lastWorkingDay;
  }
  if (body.notes != null) update.notes = String(body.notes).trim();

  let updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  updated = (await tryDeactivateExitRequest(updated, actorId, "exit_approved_deactivated")) ?? updated;

  await logHrmAudit({
    actorId,
    action: "exit_approved",
    entityType: "hrm_exit",
    entityId: id,
    severity: "info",
    metadata: { userId: updated.userId },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function rejectExitRequest(id, body = {}, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be rejected.");
  if ((row.approvalStatus ?? "pending") !== "pending") {
    badRequest("Exit request is not pending approval.");
  }

  const rejectionReason = String(body.rejectionReason ?? "").trim();
  if (!rejectionReason) badRequest("Rejection reason is required.");

  const update = {
    approvalStatus: "rejected",
    rejectedAt: new Date(),
    rejectedByUserId: actorId ?? null,
    rejectionReason,
    status: "cancelled",
    approvedAt: null,
    approvedByUserId: null,
  };

  const updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  await logHrmAudit({
    actorId,
    action: "exit_rejected",
    entityType: "hrm_exit",
    entityId: id,
    severity: "warning",
    metadata: { userId: updated.userId, rejectionReason },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function advanceExitStage(id, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be advanced.");
  if ((row.approvalStatus ?? "pending") !== "approved") {
    badRequest("Approve the exit request before advancing the workflow.");
  }

  const nextStage = Math.min((row.stage ?? 1) + 1, EXIT_WORKFLOW_STAGES.length);
  const update = { stage: nextStage };
  const reachedFinalStage = nextStage === EXIT_WORKFLOW_STAGES.length;

  if (reachedFinalStage && isExitDeactivationDue(row.lastWorkingDay)) {
    update.status = "completed";
  }

  let updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  if (reachedFinalStage) {
    updated = (await tryDeactivateExitRequest(updated, actorId, "exit_completed")) ?? updated;
  }

  await logHrmAudit({
    actorId,
    action: reachedFinalStage && updated.autoDeactivatedAt ? "exit_completed" : "exit_stage_advanced",
    entityType: "hrm_exit",
    entityId: id,
    severity: reachedFinalStage && updated.autoDeactivatedAt ? "warning" : "info",
    metadata: { stage: nextStage, userId: updated.userId },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function returnExitAssets(id, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can return assets.");

  const result = await returnAssetsForUser(row.userId, actorId);
  const updated = await hrmExitRequestsTable
    .findOneAndUpdate(
      { id },
      { $set: { assetReturnComplete: true, stage: Math.max(row.stage ?? 1, 4) } },
      { new: true },
    )
    .lean();

  await logHrmAudit({
    actorId,
    action: "exit_assets_returned",
    entityType: "hrm_exit",
    entityId: id,
    severity: "info",
    metadata: { userId: row.userId, returned: result.returned },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function cancelExitRequest(id, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be cancelled.");

  const updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: { status: "cancelled" } }, { new: true })
    .lean();

  await logHrmAudit({
    actorId,
    action: "exit_cancelled",
    entityType: "hrm_exit",
    entityId: id,
    severity: "warning",
    metadata: { userId: row.userId },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export { EXIT_WORKFLOW_STAGES };
