import { getNextSequence, caDocumentsTable } from "../../../models/schema/index.js";
import { CA_DOCUMENT_CATEGORIES } from "../../../constants/ca.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly, resolveUserName, resolveUserNames, softDeleteFields } from "../services/helpers.js";

function formatDoc(doc, uploaderName) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    version: doc.version ?? "1.0",
    fileUrl: doc.fileUrl ?? null,
    linkedEntityType: doc.linkedEntityType ?? null,
    linkedEntityId: doc.linkedEntityId ?? null,
    uploadedAt: dateOnly(doc.uploadedAt) ?? dateOnly(doc.createdAt),
    uploadedById: doc.uploadedById ?? null,
    uploadedBy: uploaderName ?? doc.uploadedByName ?? "—",
    createdBy: doc.createdBy ?? null,
    createdAt: dateOnly(doc.createdAt),
    updatedAt: dateOnly(doc.updatedAt),
  };
}

export async function listDocuments(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  if (req.query.category) query.category = String(req.query.category);
  if (req.query.search) {
    const q = String(req.query.search).trim();
    if (q) query.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const { items, total, page, limit } = await paginateModel(caDocumentsTable, query, pagination, {
    sort: { uploadedAt: -1, updatedAt: -1 },
  });

  const nameMap = await resolveUserNames(items.map((d) => d.uploadedById));
  res.json({
    documents: items.map((d) => formatDoc(d, nameMap.get(d.uploadedById))),
    total,
    page,
    limit,
  });
}

export async function getDocument(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await caDocumentsTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("CA document");
  res.json(formatDoc(doc, await resolveUserName(doc.uploadedById)));
}

async function parseBody(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.title !== undefined) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    out.title = title;
  }
  if (!partial || body.category !== undefined) {
    const category = optionalString(body.category);
    if (!category || !CA_DOCUMENT_CATEGORIES.includes(category)) {
      badRequest("Valid category is required.", "category");
    }
    out.category = category;
  }
  if (body.version !== undefined) out.version = optionalString(body.version) ?? "1.0";
  if (body.fileUrl !== undefined) out.fileUrl = optionalString(body.fileUrl);
  if (body.linkedEntityType !== undefined) {
    const LINK_TYPES = [
      "gst_filing",
      "tds_return",
      "roc_filing",
      "notice",
      "company_itr",
      "director_itr",
      "audit",
      "task",
    ];
    const t = optionalString(body.linkedEntityType);
    if (t && !LINK_TYPES.includes(t)) badRequest("Invalid linkedEntityType.", "linkedEntityType");
    out.linkedEntityType = t;
  }
  if (body.linkedEntityId !== undefined) {
    out.linkedEntityId =
      body.linkedEntityId != null && body.linkedEntityId !== ""
        ? Number(body.linkedEntityId)
        : null;
  }
  if (body.uploadedAt !== undefined) {
    const d = body.uploadedAt ? new Date(body.uploadedAt) : new Date();
    if (Number.isNaN(d.getTime())) badRequest("Invalid uploadedAt.", "uploadedAt");
    out.uploadedAt = d;
  }
  if (body.uploadedById !== undefined || body.uploadedByName !== undefined) {
    const uploadedById = body.uploadedById != null ? Number(body.uploadedById) : null;
    out.uploadedById = Number.isFinite(uploadedById) ? uploadedById : null;
    out.uploadedByName =
      optionalString(body.uploadedByName) ?? (await resolveUserName(out.uploadedById));
  }
  return out;
}

export async function createDocument(req, res) {
  const fields = await parseBody(req.body ?? {});
  if (!fields.uploadedById) {
    fields.uploadedById = req.user.id;
    fields.uploadedByName = req.user.name ?? (await resolveUserName(req.user.id));
  }
  if (!fields.uploadedAt) fields.uploadedAt = new Date();
  if (!fields.version) fields.version = "1.0";
  const id = await getNextSequence("ca_documents");
  const doc = await caDocumentsTable.create({
    id,
    ...fields,
    createdBy: req.user.id,
  });
  res.status(201).json(formatDoc(doc.toObject?.() ?? doc, fields.uploadedByName));
}

export async function updateDocument(req, res) {
  const id = parseIdParam(req.params.id);
  const existing = await caDocumentsTable.findOne({ id, isDeleted: false }).lean();
  if (!existing) notFound("CA document");
  const fields = await parseBody(req.body ?? {}, { partial: true });
  const updated = await caDocumentsTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: fields }, { new: true })
    .lean();
  res.json(formatDoc(updated, await resolveUserName(updated.uploadedById)));
}

export async function deleteDocument(req, res) {
  const id = parseIdParam(req.params.id);
  const updated = await caDocumentsTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: softDeleteFields() }, { new: true })
    .lean();
  if (!updated) notFound("CA document");
  res.json({ ok: true, id });
}
