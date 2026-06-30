import crypto from "crypto";
import {
  candidatesTable,
  departmentsTable,
  usersTable,
  credentialHistoryTable,
  getNextSequence,
  staffEmployeeRoles,
} from "../../models/schema/index.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";
import { notFound, badRequest, conflict, optionalString } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";
import { recruitmentStages } from "../../constants/hrm-workflow.js";
import { hashPassword, encryptPasswordForHistory } from "../../lib/password.js";
import { generateEmployeeId } from "../employeeId.js";
import { syncUserRoleTemplate, isValidUserRole } from "../permissions.service.js";
import { formatUser } from "../../mappers/user-format.js";
import * as onboardingService from "./onboarding.service.js";

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
}

export async function listCandidates() {
  const rows = await candidatesTable.find().sort({ createdAt: -1 }).lean();
  const deptIds = [...new Set(rows.map((r) => r.departmentId).filter(Boolean))];
  const departments = deptIds.length
    ? await departmentsTable.find({ id: { $in: deptIds } }, { id: 1, name: 1 }).lean()
    : [];
  const deptById = new Map(departments.map((d) => [d.id, d.name]));

  return rows.map((row) => ({
    ...row,
    departmentName: row.departmentId ? deptById.get(row.departmentId) ?? null : null,
    appliedOn: row.createdAt,
  }));
}

export async function createCandidate(body) {
  if (!body.name?.trim()) badRequest("Candidate name is required.");
  if (!body.email?.trim()) badRequest("Candidate email is required.");
  if (!body.position?.trim()) badRequest("Position is required.");
  if (body.resumeUrl) validateStoredFileUrl(body.resumeUrl, "resumeUrl");
  if (body.stage && !recruitmentStages.includes(body.stage)) {
    badRequest("Invalid recruitment stage.");
  }
  const { getNextSequence } = await import("../../models/schema/index.js");
  const id = await getNextSequence("candidates");
  return candidatesTable.create({
    id,
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone ?? null,
    position: body.position.trim(),
    departmentId: body.departmentId ?? null,
    stage: body.stage ?? "applied",
    notes: body.notes ?? null,
    resumeUrl: body.resumeUrl ?? null,
    experienceYears: body.experienceYears != null ? Number(body.experienceYears) : null,
    source: body.source?.trim() || null,
    rating: body.rating != null ? Math.min(5, Math.max(0, Number(body.rating))) : null,
  });
}

async function resolveHiredUserIdForEmail(email) {
  const employee = await usersTable
    .findOne({ email: email.trim().toLowerCase(), role: { $in: hrmEmployeeRoles } }, { id: 1 })
    .lean();
  return employee?.id ?? null;
}

export async function updateCandidate(id, body) {
  const patch = { ...body };
  if (patch.name != null) patch.name = String(patch.name).trim();
  if (patch.email != null) patch.email = String(patch.email).trim().toLowerCase();
  if (patch.position != null) patch.position = String(patch.position).trim();
  if (patch.resumeUrl != null) validateStoredFileUrl(patch.resumeUrl, "resumeUrl");
  if (patch.stage != null && !recruitmentStages.includes(patch.stage)) {
    badRequest("Invalid recruitment stage.");
  }
  if (patch.experienceYears != null) patch.experienceYears = Number(patch.experienceYears);
  if (patch.rating != null) patch.rating = Math.min(5, Math.max(0, Number(patch.rating)));
  if (patch.source != null) patch.source = String(patch.source).trim() || null;

  const existing = await candidatesTable.findOne({ id }).lean();
  if (!existing) notFound("Candidate");

  if (patch.stage === "onboarding") {
    const hiredUserId = await resolveHiredUserIdForEmail(patch.email ?? existing.email);
    if (hiredUserId != null) patch.hiredUserId = hiredUserId;
  }

  const c = await candidatesTable.findOneAndUpdate({ id }, { $set: patch }, { new: true });
  if (!c) notFound("Candidate");
  return c;
}

export async function deleteCandidate(id) {
  const c = await candidatesTable.findOneAndDelete({ id });
  if (!c) notFound("Candidate");
  return { deleted: true };
}

/** @deprecated legacy flat tasks — use onboarding records */
export async function listOnboardingTasks(candidateId) {
  const record = await onboardingService.getOnboardingByCandidateId(candidateId);
  if (record) {
    return record.tasks.map((t, i) => ({
      id: i,
      candidateId,
      title: t.title,
      completed: t.completed,
    }));
  }
  return [];
}

export async function startOnboarding(candidateId, actorId = null) {
  return onboardingService.createOnboardingFromCandidate(candidateId, actorId);
}

/** Create a Team employee account from a candidate (auto temp password when omitted). */
export async function createEmployeeFromCandidate(candidateId, body = {}, actor) {
  const candidate = await candidatesTable.findOne({ id: candidateId }).lean();
  if (!candidate) notFound("Candidate");

  if (candidate.hiredUserId) {
    const existing = await usersTable.findOne({ id: candidate.hiredUserId }).lean();
    if (existing) {
      return {
        user: formatUser(existing, { includeSensitive: true }),
        alreadyExisted: true,
        candidateId,
      };
    }
  }

  const email = candidate.email.trim().toLowerCase();
  const duplicate = await usersTable.findOne({ email }).lean();
  if (duplicate) conflict("This email is already registered.", "email");

  const role = optionalString(body.role) || "developer";
  if (!(await isValidUserRole(role))) badRequest("Invalid role.", "role");
  if (!staffEmployeeRoles.includes(role)) {
    badRequest("Role must be a staff employee role.", "role");
  }

  const customPassword = optionalString(body.password);
  const password =
    customPassword && customPassword.length >= 8 ? customPassword : generateTemporaryPassword();
  const generatedPassword = !customPassword || customPassword.length < 8;

  let departmentName = "Engineering";
  if (candidate.departmentId) {
    const dept = await departmentsTable.findOne({ id: candidate.departmentId }, { name: 1 }).lean();
    if (dept?.name) departmentName = dept.name;
  }

  const passwordHash = await hashPassword(password);
  const employeeId = staffEmployeeRoles.includes(role)
    ? await generateEmployeeId(candidate.name)
    : null;
  const userId = await getNextSequence("users");

  const user = await usersTable.create({
    id: userId,
    email,
    passwordHash,
    role,
    employeeId,
    name: candidate.name.trim(),
    phoneNumber: candidate.phone ?? null,
    designation: candidate.position ?? null,
    department: departmentName,
    status: "active",
    forcePasswordChange: generatedPassword,
    roleTemplateId: null,
    hrmRoleTemplateId: null,
  });

  await syncUserRoleTemplate(user.id, role, { roleChanged: true });

  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: 1,
    setByUserId: actor.id,
    setByLabel: actor.name,
    passwordEncrypted: encryptPasswordForHistory(password),
    trigger: "initial_setup",
    status: "active",
  });

  await candidatesTable.updateOne({ id: candidateId }, { $set: { hiredUserId: user.id } });

  const shouldStartOnboarding = body.startOnboarding === true;
  let onboardingRecord = null;
  if (shouldStartOnboarding) {
    onboardingRecord = await onboardingService.createOnboardingFromCandidate(
      candidateId,
      actor?.id ?? null,
    );
  }

  return {
    user: formatUser(user.toObject(), { includeSensitive: true }),
    ...(generatedPassword ? { temporaryPassword: password } : {}),
    onboardingRecord,
    candidateId,
  };
}

export async function completeOnboardingTask(_id) {
  badRequest("Use PATCH /hrm/onboarding/:id/tasks/:taskIndex instead.");
}
