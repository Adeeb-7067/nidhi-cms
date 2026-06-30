import {
  onboardingRecordsTable,
  usersTable,
  candidatesTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { notFound, badRequest, conflict } from "../../utils/route-errors.js";
import { assertOnboardingEligibleEmployee } from "./employees.service.js";
import { DEFAULT_ONBOARDING_TASKS, onboardingStatuses } from "../../constants/hrm-workflow.js";
import { getOrCreateSettings } from "../company-settings.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { logHrmAudit } from "./hrm-audit.service.js";

export function buildDefaultOnboardingTasks(doneCount = 0) {
  return buildDefaultOnboardingTasksFromTitles(DEFAULT_ONBOARDING_TASKS, doneCount);
}

export function buildDefaultOnboardingTasksFromTitles(titles, doneCount = 0) {
  return titles.map((title, idx) => ({
    title,
    completed: idx < doneCount,
  }));
}

export async function resolveOnboardingTaskTitles() {
  const settings = await getOrCreateSettings();
  const template = settings.hrmOnboardingChecklistTemplate;
  if (Array.isArray(template) && template.length > 0) {
    const titles = template.map((t) => String(t).trim()).filter(Boolean);
    if (titles.length > 0) return titles;
  }
  return DEFAULT_ONBOARDING_TASKS;
}

async function buildOnboardingTasks(doneCount = 0) {
  const titles = await resolveOnboardingTaskTitles();
  return buildDefaultOnboardingTasksFromTitles(titles, doneCount);
}

function assertBuddyNotSelf(userId, buddyId) {
  if (buddyId != null && Number(buddyId) === Number(userId)) {
    badRequest("Buddy cannot be the same employee.");
  }
}

export function computeOnboardingProgress(tasks = []) {
  const total = tasks.length;
  if (total === 0) return 0;
  const done = tasks.filter((t) => t.completed).length;
  return Math.round((done / total) * 100);
}

async function loadUserBrief(userId) {
  if (!userId) return null;
  return usersTable
    .findOne({ id: userId }, { id: 1, name: 1, email: 1, designation: 1, avatarUrl: 1, employeeId: 1 })
    .lean();
}

async function mapOnboardingRecord(row) {
  const [employee, buddy, candidate] = await Promise.all([
    loadUserBrief(row.userId),
    loadUserBrief(row.buddyId),
    row.candidateId
      ? candidatesTable.findOne({ id: row.candidateId }, { id: 1, name: 1, email: 1 }).lean()
      : null,
  ]);
  const tasks = row.tasks ?? [];
  const progress = computeOnboardingProgress(tasks);
  return {
    id: row.id,
    userId: row.userId,
    candidateId: row.candidateId ?? null,
    buddyId: row.buddyId ?? null,
    startDate: row.startDate,
    status: row.status ?? "active",
    tasks,
    progress,
    employeeName: employee?.name ?? "Unknown",
    employeeEmail: employee?.email ?? null,
    employeeDesignation: employee?.designation ?? null,
    employeeAvatarUrl: employee?.avatarUrl ?? null,
    employeeCode: employee?.employeeId ?? null,
    buddyName: buddy?.name ?? null,
    candidateName: candidate?.name ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listOnboardingRecords({ status } = {}) {
  const query = {};
  if (status && onboardingStatuses.includes(status)) {
    query.status = status;
  }
  const rows = await onboardingRecordsTable.find(query).sort({ startDate: -1 }).lean();
  return Promise.all(rows.map(mapOnboardingRecord));
}

export async function getOnboardingRecord(id) {
  const row = await onboardingRecordsTable.findOne({ id }).lean();
  if (!row) notFound("Onboarding record");
  return mapOnboardingRecord(row);
}

export async function createOnboardingRecord(body, actorId = null) {
  const userId = Number(body.userId);
  if (!userId) badRequest("userId is required.");

  await assertOnboardingEligibleEmployee(userId);

  if (body.buddyId != null) {
    const buddyId = Number(body.buddyId);
    assertBuddyNotSelf(userId, buddyId);
    const buddy = await usersTable.findOne({ id: buddyId, role: { $in: hrmEmployeeRoles } }).lean();
    if (!buddy || buddy.status !== "active") notFound("Buddy employee");
  }

  const id = await getNextSequence("onboarding_records");
  const record = await onboardingRecordsTable.create({
    id,
    userId,
    candidateId: body.candidateId ?? null,
    buddyId: body.buddyId ?? null,
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    status: "active",
    tasks: await buildOnboardingTasks(0),
  });

  await logHrmAudit({
    actorId,
    action: "onboarding_started",
    entityType: "onboarding",
    entityId: id,
    severity: "info",
    metadata: { userId, candidateId: body.candidateId ?? null },
  });

  return mapOnboardingRecord(record.toObject());
}

export async function createOnboardingFromCandidate(candidateId, actorId = null) {
  const candidate = await candidatesTable.findOne({ id: candidateId }).lean();
  if (!candidate) notFound("Candidate");

  const employee = await usersTable
    .findOne({ email: candidate.email.trim().toLowerCase(), role: { $in: hrmEmployeeRoles } })
    .lean();
  if (!employee) {
    badRequest(
      "No employee with this email. Create the employee in Team first, then start onboarding.",
    );
  }

  const existing = await onboardingRecordsTable.findOne({ userId: employee.id }).lean();
  if (existing) {
    if (candidate.stage !== "hired") {
      await candidatesTable.updateOne({ id: candidateId }, { $set: { stage: "hired", hiredUserId: employee.id } });
    }
    return mapOnboardingRecord(existing);
  }

  const id = await getNextSequence("onboarding_records");
  const record = await onboardingRecordsTable.create({
    id,
    userId: employee.id,
    candidateId,
    startDate: new Date(),
    status: "active",
    tasks: await buildOnboardingTasks(1),
  });

  await candidatesTable.updateOne(
    { id: candidateId },
    { $set: { stage: "hired", hiredUserId: employee.id } },
  );

  await logHrmAudit({
    actorId,
    action: "onboarding_started_from_candidate",
    entityType: "onboarding",
    entityId: id,
    severity: "info",
    metadata: { userId: employee.id, candidateId },
  });

  return mapOnboardingRecord(record.toObject());
}

export async function updateOnboardingRecord(id, body, actorId = null) {
  const record = await onboardingRecordsTable.findOne({ id });
  if (!record) notFound("Onboarding record");

  const patch = {};
  if (body.buddyId !== undefined) {
    if (body.buddyId == null) {
      patch.buddyId = null;
    } else {
      const buddyId = Number(body.buddyId);
      assertBuddyNotSelf(record.userId, buddyId);
      const buddy = await usersTable.findOne({ id: buddyId, status: "active" }).lean();
      if (!buddy) notFound("Buddy employee");
      patch.buddyId = buddyId;
    }
  }
  if (body.startDate !== undefined) patch.startDate = new Date(body.startDate);
  if (body.status !== undefined) {
    if (!onboardingStatuses.includes(body.status)) badRequest("Invalid onboarding status.");
    patch.status = body.status;
  }

  if (Object.keys(patch).length) {
    await onboardingRecordsTable.updateOne({ id }, { $set: patch });
  }

  if (Object.keys(patch).length) {
    await logHrmAudit({
      actorId,
      action: "onboarding_updated",
      entityType: "onboarding",
      entityId: id,
      severity: "info",
      metadata: patch,
    });
  }

  return getOnboardingRecord(id);
}

export async function toggleOnboardingTask(recordId, taskIndex, actorId = null) {
  const row = await onboardingRecordsTable.findOne({ id: recordId }).lean();
  if (!row) notFound("Onboarding record");

  const idx = Number(taskIndex);
  const tasks = (row.tasks ?? []).map((t) => ({
    title: String(t.title),
    completed: Boolean(t.completed),
  }));
  if (Number.isNaN(idx) || idx < 0 || idx >= tasks.length) {
    badRequest("Invalid task index.");
  }

  tasks[idx] = { ...tasks[idx], completed: !tasks[idx].completed };
  const progress = computeOnboardingProgress(tasks);
  const status = progress === 100 ? "complete" : "active";

  await onboardingRecordsTable.updateOne(
    { id: recordId },
    { $set: { tasks, status } },
  );

  await logHrmAudit({
    actorId,
    action: "onboarding_task_toggled",
    entityType: "onboarding",
    entityId: recordId,
    severity: "info",
    metadata: { taskIndex: idx, completed: tasks[idx].completed },
  });

  return getOnboardingRecord(recordId);
}

export async function deleteOnboardingRecord(id, actorId = null) {
  const record = await onboardingRecordsTable.findOne({ id }).lean();
  if (!record) notFound("Onboarding record");
  await onboardingRecordsTable.deleteOne({ id });

  await logHrmAudit({
    actorId,
    action: "onboarding_deleted",
    entityType: "onboarding",
    entityId: id,
    severity: "info",
    metadata: { userId: record.userId },
  });

  return { deleted: true };
}

export async function getOnboardingByCandidateId(candidateId) {
  const row = await onboardingRecordsTable.findOne({ candidateId }).lean();
  if (!row) return null;
  return mapOnboardingRecord(row);
}
