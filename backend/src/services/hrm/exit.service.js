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

function startOfUtcDay(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function computeNoticeDaysRemaining(lastWorkingDay) {
  if (!lastWorkingDay) return 0;
  const today = startOfUtcDay(new Date());
  const lwd = startOfUtcDay(lastWorkingDay);
  const diff = Math.round((lwd.getTime() - today.getTime()) / MS_PER_DAY);
  return Math.max(0, diff);
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
    stage: row.stage ?? 1,
    stageLabel: EXIT_WORKFLOW_STAGES[(row.stage ?? 1) - 1] ?? EXIT_WORKFLOW_STAGES[0],
    stageCount: EXIT_WORKFLOW_STAGES.length,
    status: row.status ?? "active",
    assetReturnComplete: Boolean(row.assetReturnComplete),
    fnfSettled: Boolean(row.fnfSettled),
    noticeDaysRemaining,
    assignedAssetCount,
    notes: row.notes ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listExitRequests({ status } = {}) {
  const query = {};
  if (status && exitRequestStatuses.includes(status)) {
    query.status = status;
  } else {
    query.status = "active";
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
  const lastWorkingDay = body.lastWorkingDay ? new Date(body.lastWorkingDay) : null;
  if (!resignationDate || Number.isNaN(resignationDate.getTime())) {
    badRequest("Valid resignation date is required.");
  }
  if (!lastWorkingDay || Number.isNaN(lastWorkingDay.getTime())) {
    badRequest("Valid last working day is required.");
  }
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
    stage: 1,
    status: "active",
    notes: String(body.notes ?? "").trim(),
  });

  await logHrmAudit({
    actorId,
    action: "exit_started",
    entityType: "hrm_exit",
    entityId: id,
    severity: "info",
    metadata: { userId, reason },
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
  if (body.resignationDate != null) {
    const resignationDate = new Date(body.resignationDate);
    if (Number.isNaN(resignationDate.getTime())) badRequest("Invalid resignation date.");
    update.resignationDate = resignationDate;
  }
  if (body.lastWorkingDay != null) {
    const lastWorkingDay = new Date(body.lastWorkingDay);
    if (Number.isNaN(lastWorkingDay.getTime())) badRequest("Invalid last working day.");
    update.lastWorkingDay = lastWorkingDay;
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
    update.stage = EXIT_WORKFLOW_STAGES.length;
    update.status = "completed";
    completeExit = true;
  }

  if (!Object.keys(update).length) badRequest("No exit fields to update.");

  const updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  if (completeExit) {
    await finalizeEmployeeExit(updated.userId, updated.lastWorkingDay);
  }

  await logHrmAudit({
    actorId,
    action: completeExit ? "exit_completed" : "exit_updated",
    entityType: "hrm_exit",
    entityId: id,
    severity: completeExit ? "warning" : "info",
    metadata: { fields: Object.keys(update), userId: updated.userId },
  });

  return mapExitRequest(updated, { includeAssets: true });
}

export async function advanceExitStage(id, actorId = null) {
  const row = await hrmExitRequestsTable.findOne({ id }).lean();
  if (!row) notFound("Exit request");
  if (row.status !== "active") badRequest("Only active exit requests can be advanced.");

  const nextStage = Math.min((row.stage ?? 1) + 1, EXIT_WORKFLOW_STAGES.length);
  const update = { stage: nextStage };
  let completeExit = false;

  if (nextStage === EXIT_WORKFLOW_STAGES.length) {
    update.status = "completed";
    completeExit = true;
  }

  const updated = await hrmExitRequestsTable
    .findOneAndUpdate({ id }, { $set: update }, { new: true })
    .lean();

  if (completeExit) {
    await finalizeEmployeeExit(updated.userId, updated.lastWorkingDay);
  }

  await logHrmAudit({
    actorId,
    action: completeExit ? "exit_completed" : "exit_stage_advanced",
    entityType: "hrm_exit",
    entityId: id,
    severity: completeExit ? "warning" : "info",
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
