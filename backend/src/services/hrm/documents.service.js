import { employeeDocumentsTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { notFound, badRequest } from "../../utils/route-errors.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";
import { documentStatuses } from "../../constants/hrm-workflow.js";
import { hrmEmployeeRoles } from "../../constants/user-roles.js";

/** Synthetic ids for profile-stored files (never collide with employee_documents sequences). */
export const PROFILE_DOCUMENT_ID_BASE = 2_000_000_000;

export function isProfileDocumentId(id) {
  return Number(id) >= PROFILE_DOCUMENT_ID_BASE;
}

function profileDocId(userId, slot) {
  return PROFILE_DOCUMENT_ID_BASE + userId * 100 + slot;
}

function mapEmbeddedTypeToCategory(type) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("resume")) return "resume";
  if (t.includes("certificate")) return "certificate";
  if (t.includes("contract")) return "contract";
  if (t.includes("id") || t.includes("address")) return "id_proof";
  return "general";
}

function mapEmbeddedStatusToReview(status) {
  const s = String(status ?? "Active");
  if (s === "Pending Signature") return "pending";
  if (s === "Expired") return "rejected";
  return "approved";
}

function profileFieldDoc(user, slot, name, category, fileUrl, createdAt) {
  if (!fileUrl?.trim()) return null;
  return {
    id: profileDocId(user.id, slot),
    userId: user.id,
    userName: user.name ?? "Unknown",
    employeeId: user.employeeId ?? null,
    name,
    category,
    fileUrl: fileUrl.trim(),
    status: "approved",
    source: "profile",
    createdAt: createdAt ?? user.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

/** Collect documents stored on the user profile (resume, proofs, certificates, profileDocuments). */
export function collectProfileDocuments(user) {
  if (!user?.id) return [];
  const docs = [];
  const base = {
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    updatedAt: user.updatedAt,
  };

  const resume = profileFieldDoc(base, 1, "Resume", "resume", user.resumeUrl);
  if (resume) docs.push(resume);

  const idProof = profileFieldDoc(base, 2, "ID proof", "id_proof", user.idProofUrl);
  if (idProof) docs.push(idProof);

  const addressProof = profileFieldDoc(base, 3, "Address proof", "id_proof", user.addressProofUrl);
  if (addressProof) docs.push(addressProof);

  (user.certificateUrls ?? []).forEach((url, i) => {
    const doc = profileFieldDoc(base, 10 + i, `Certificate ${i + 1}`, "certificate", url);
    if (doc) docs.push(doc);
  });

  (user.profileDocuments ?? []).forEach((item, i) => {
    if (!item?.fileUrl?.trim()) return;
    docs.push({
      id: profileDocId(user.id, 30 + i),
      userId: user.id,
      userName: user.name ?? "Unknown",
      employeeId: user.employeeId ?? null,
      name: item.name?.trim() || `Profile document ${i + 1}`,
      category: mapEmbeddedTypeToCategory(item.type),
      fileUrl: item.fileUrl.trim(),
      status: mapEmbeddedStatusToReview(item.status),
      source: "profile",
      createdAt:
        item.uploadedAt?.toISOString?.() ??
        user.updatedAt?.toISOString?.() ??
        new Date().toISOString(),
    });
  });

  return docs;
}

const USER_DOC_FIELDS = {
  id: 1,
  name: 1,
  employeeId: 1,
  resumeUrl: 1,
  idProofUrl: 1,
  addressProofUrl: 1,
  certificateUrls: 1,
  profileDocuments: 1,
  updatedAt: 1,
};

async function loadUsersForDocumentScope(userId) {
  if (userId) {
    const user = await usersTable.findOne({ id: userId }, USER_DOC_FIELDS).lean();
    return user ? [user] : [];
  }
  return usersTable
    .find({ status: "active", role: { $in: hrmEmployeeRoles } }, USER_DOC_FIELDS)
    .lean();
}

function dedupeDocuments(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = `${row.userId}:${row.fileUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export async function countDocuments(userId) {
  const [tableCount, users] = await Promise.all([
    employeeDocumentsTable.countDocuments(userId ? { userId } : {}),
    loadUsersForDocumentScope(userId),
  ]);
  const profileCount = users.reduce((sum, u) => sum + collectProfileDocuments(u).length, 0);
  return tableCount + profileCount;
}

export async function listDocuments(userId) {
  const query = userId ? { userId } : {};
  const [rows, users] = await Promise.all([
    employeeDocumentsTable.find(query).sort({ createdAt: -1 }).lean(),
    loadUsersForDocumentScope(userId),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  for (const id of [...new Set(rows.map((r) => r.userId))]) {
    if (!userMap.has(id)) {
      const u = await usersTable.findOne({ id }, { id: 1, name: 1, employeeId: 1 }).lean();
      if (u) userMap.set(id, u);
    }
  }

  const libraryDocs = rows.map((r) => {
    const u = userMap.get(r.userId);
    return {
      ...r,
      userName: u?.name ?? "Unknown",
      employeeId: u?.employeeId ?? null,
      source: "library",
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
    };
  });

  const profileDocs = users.flatMap((u) => collectProfileDocuments(u));

  return dedupeDocuments([...libraryDocs, ...profileDocs]).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

export async function createDocument(userId, body) {
  if (!body.name?.trim()) badRequest("Document name is required.");
  validateStoredFileUrl(body.fileUrl, "fileUrl");
  const id = await getNextSequence("employee_documents");
  const doc = await employeeDocumentsTable.create({
    id,
    userId,
    name: body.name.trim(),
    category: body.category ?? "general",
    fileUrl: body.fileUrl,
    status: "pending",
  });
  return { ...doc.toObject(), source: "library" };
}

export async function reviewDocument(id, { status, reviewNote }, reviewerId) {
  if (isProfileDocumentId(id)) {
    badRequest("Profile documents are managed from the employee profile.");
  }
  if (!documentStatuses.includes(status)) {
    badRequest("Invalid document status.");
  }
  const doc = await employeeDocumentsTable.findOneAndUpdate(
    { id },
    { $set: { status, reviewedBy: reviewerId, reviewNote: reviewNote ?? null } },
    { new: true },
  );
  if (!doc) notFound("Document");
  return { ...doc.toObject(), source: "library" };
}

export async function deleteDocument(id) {
  if (isProfileDocumentId(id)) {
    badRequest("Profile documents are managed from the employee profile.");
  }
  const doc = await employeeDocumentsTable.findOne({ id }).lean();
  if (!doc) notFound("Document");
  await employeeDocumentsTable.deleteOne({ id });
  return { ok: true };
}
