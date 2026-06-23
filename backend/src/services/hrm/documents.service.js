import { employeeDocumentsTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { notFound, badRequest } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";
import { documentStatuses } from "../../constants/hrm-workflow.js";

export async function countDocuments(userId) {
  return employeeDocumentsTable.countDocuments(userId ? { userId } : {});
}

export async function listDocuments(userId) {
  const query = userId ? { userId } : {};
  const rows = await employeeDocumentsTable.find(query).sort({ createdAt: -1 }).lean();
  const users = await usersTable.find(
    { id: { $in: [...new Set(rows.map((r) => r.userId))] } },
    { id: 1, name: 1, employeeId: 1 },
  ).lean();
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    userName: userMap.get(r.userId)?.name ?? "Unknown",
    employeeId: userMap.get(r.userId)?.employeeId ?? null,
  }));
}

export async function createDocument(userId, body) {
  if (!body.name?.trim()) badRequest("Document name is required.");
  validateStoredFileUrl(body.fileUrl, "fileUrl");
  const id = await getNextSequence("employee_documents");
  return employeeDocumentsTable.create({
    id,
    userId,
    name: body.name.trim(),
    category: body.category ?? "general",
    fileUrl: body.fileUrl,
    status: "pending",
  });
}

export async function reviewDocument(id, { status, reviewNote }, reviewerId) {
  if (!documentStatuses.includes(status)) {
    badRequest("Invalid document status.");
  }
  const doc = await employeeDocumentsTable.findOneAndUpdate(
    { id },
    { $set: { status, reviewedBy: reviewerId, reviewNote: reviewNote ?? null } },
    { new: true },
  );
  if (!doc) notFound("Document");
  return doc;
}

export async function deleteDocument(id) {
  const doc = await employeeDocumentsTable.findOne({ id }).lean();
  if (!doc) notFound("Document");
  await employeeDocumentsTable.deleteOne({ id });
  return { ok: true };
}
