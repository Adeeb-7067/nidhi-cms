import { candidatesTable, onboardingTasksTable, getNextSequence } from "../../models/schema/index.js";
import { notFound, badRequest } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";
import { recruitmentStages } from "../../constants/hrm-workflow.js";

export async function listCandidates() {
  return candidatesTable.find().sort({ createdAt: -1 }).lean();
}

export async function createCandidate(body) {
  if (!body.name?.trim()) badRequest("Candidate name is required.");
  if (!body.email?.trim()) badRequest("Candidate email is required.");
  if (!body.position?.trim()) badRequest("Position is required.");
  if (body.resumeUrl) validateStoredFileUrl(body.resumeUrl, "resumeUrl");
  if (body.stage && !recruitmentStages.includes(body.stage)) {
    badRequest("Invalid recruitment stage.");
  }
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
  });
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
  const c = await candidatesTable.findOneAndUpdate({ id }, { $set: patch }, { new: true });  if (!c) notFound("Candidate");
  return c;
}

export async function startOnboarding(candidateId) {
  const candidate = await candidatesTable.findOne({ id: candidateId });
  if (!candidate) notFound("Candidate");
  const tasks = [
    "Complete HR paperwork",
    "IT equipment setup",
    "Policy acknowledgement",
    "Team introduction",
  ];
  const created = [];
  for (const title of tasks) {
    const id = await getNextSequence("onboarding_tasks");
    created.push(await onboardingTasksTable.create({ id, candidateId, title }));
  }
  await candidatesTable.updateOne({ id: candidateId }, { $set: { stage: "hired" } });
  return created;
}

export async function listOnboardingTasks(candidateId) {
  return onboardingTasksTable.find({ candidateId }).lean();
}

export async function completeOnboardingTask(id) {
  return onboardingTasksTable.findOneAndUpdate(
    { id },
    { $set: { completed: true, completedAt: new Date() } },
    { new: true },
  );
}
