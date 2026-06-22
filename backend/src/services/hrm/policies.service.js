import {
  hrmPoliciesTable,
  policyAcknowledgementsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { badRequest, notFound } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";

export async function listPolicies() {
  return hrmPoliciesTable.find({ isActive: true }).sort({ title: 1 }).lean();
}

export async function createPolicy(body) {
  if (!body.title?.trim()) badRequest("Policy title is required.");
  if (body.fileUrl) validateStoredFileUrl(body.fileUrl, "fileUrl");
  const id = await getNextSequence("hrm_policies");
  return hrmPoliciesTable.create({
    id,
    title: body.title.trim(),
    description: body.description ?? null,
    category: body.category?.trim() || "General",
    fileUrl: body.fileUrl ?? null,
    version: body.version ?? "1.0",
    isActive: true,
  });
}

export async function updatePolicy(id, body) {
  const patch = {};
  if (body.title !== undefined) {
    if (!body.title?.trim()) badRequest("Policy title is required.");
    patch.title = body.title.trim();
  }
  if (body.description !== undefined) patch.description = body.description ?? null;
  if (body.category !== undefined) patch.category = body.category?.trim() || "General";
  if (body.version !== undefined) patch.version = body.version ?? "1.0";
  if (body.fileUrl !== undefined) {
    if (body.fileUrl) validateStoredFileUrl(body.fileUrl, "fileUrl");
    patch.fileUrl = body.fileUrl || null;
  }
  const policy = await hrmPoliciesTable.findOneAndUpdate({ id, isActive: true }, { $set: patch }, { new: true });
  if (!policy) notFound("Policy");
  return policy;
}

export async function deletePolicy(id) {
  const policy = await hrmPoliciesTable.findOneAndUpdate(
    { id, isActive: true },
    { $set: { isActive: false } },
    { new: true },
  );
  if (!policy) notFound("Policy");
}

export async function acknowledgePolicy(userId, policyId) {
  const existing = await policyAcknowledgementsTable.findOne({ policyId, userId });
  if (existing) return existing;
  const id = await getNextSequence("policy_acknowledgements");
  return policyAcknowledgementsTable.create({ id, policyId, userId });
}

export async function listAcknowledgements(userId) {
  return policyAcknowledgementsTable.find({ userId }).lean();
}
