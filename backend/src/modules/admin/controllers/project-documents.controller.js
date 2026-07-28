import {
  ProjectDocuments,
  Projects,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { projectDocumentFieldTypes, projectDocumentRenewalKinds } from "../schema/project-documents.js";
import { validateStoredFileUrl } from "../../../lib/file-storage.js";
import { encodeFields, rowToDto, computeCompleteness } from "../services/project-document-secrets.js";
import { badRequest, notFound, parseIdParam, parsePagination } from "../../../utils/route-errors.js";

const FILE_FIELD_TYPES = new Set(["file", "image"]);

function parseRenewalDate(raw, label) {
  if (!raw) badRequest(`${label} is required.`, label);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) badRequest(`${label} must be a valid date.`, label);
  return startOfDay(date);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function normalizeRenewals(raw, existingRenewals = []) {
  if (!Array.isArray(raw)) badRequest("renewals must be an array.", "renewals");

  const existingById = new Map((existingRenewals ?? []).map((r) => [r.id, r]));
  const seen = new Set();

  return raw.map((item, index) => {
    const kind = item?.kind ?? "other";
    if (!projectDocumentRenewalKinds.includes(kind)) {
      badRequest(`Renewal ${index + 1}: invalid kind.`, "renewals");
    }

    const id = String(item?.id ?? `renewal-${index}`).trim();
    if (seen.has(id)) badRequest(`Duplicate renewal id "${id}".`, "renewals");
    seen.add(id);

    const startDate = parseRenewalDate(item?.startDate, `renewals[${index}].startDate`);
    const endDate = parseRenewalDate(item?.endDate, `renewals[${index}].endDate`);
    if (endDate < startDate) {
      badRequest(`Renewal ${index + 1}: end date must be on or after start date.`, "renewals");
    }

    const existing = existingById.get(id);
    const endChanged =
      existing &&
      startOfDay(existing.endDate).getTime() !== endDate.getTime();

    return {
      id,
      kind,
      label: String(item?.label ?? "").trim(),
      provider: item?.provider == null || item?.provider === "" ? null : String(item.provider).trim(),
      startDate,
      endDate,
      notes: item?.notes == null || item?.notes === "" ? null : String(item.notes),
      lastReminderAt: endChanged ? null : (existing?.lastReminderAt ?? null),
    };
  });
}

function normalizeFields(raw) {
  if (!Array.isArray(raw)) badRequest("fields must be an array.", "fields");
  const seen = new Set();
  return raw.map((field, index) => {
    const label = String(field?.label ?? "").trim();
    if (!label) badRequest(`Field ${index + 1}: label is required.`, "fields");
    const type = field?.type ?? "text";
    if (!projectDocumentFieldTypes.includes(type)) {
      badRequest(`Field "${label}": invalid type.`, "fields");
    }
    const id = String(field?.id ?? `field-${index}`).trim();
    if (seen.has(id)) badRequest(`Duplicate field id "${id}".`, "fields");
    seen.add(id);

    const value = field?.value == null ? null : String(field.value);
    if (value && FILE_FIELD_TYPES.has(type)) {
      validateStoredFileUrl(value, `fields[${index}].value`);
    }
    if (value && type === "url" && !value.startsWith("http") && !value.startsWith("/")) {
      badRequest(`Field "${label}": URL must be a valid link or uploaded file path.`, "fields");
    }

    return { id, label, type, value: value || null };
  });
}

async function enrichList(items) {
  const projectIds = [...new Set(items.map((i) => i.projectId))];
  const userIds = [...new Set(items.flatMap((i) => [i.createdBy, i.updatedBy]).filter(Boolean))];
  const [projects, users] = await Promise.all([
    Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1, status: 1 }).lean(),
    userIds.length
      ? usersTable.find({ id: { $in: userIds } }).select({ id: 1, name: 1 }).lean()
      : [],
  ]);
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return items.map((row) => {
    const dto = rowToDto(row);
    const project = projectMap.get(row.projectId);
    return {
      ...dto,
      projectName: project?.name ?? null,
      projectStatus: project?.status ?? null,
      updatedByName: userMap.get(row.updatedBy) ?? null,
      completeness: computeCompleteness(dto),
    };
  });
}

async function listProjectDocuments(req, res) {
  const { search, projectId } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (projectId) filter.projectId = Number(projectId);

  if (search?.trim()) {
    const q = String(search).trim();
    const matchingProjects = await Projects.find({ name: { $regex: q, $options: "i" } })
      .select({ id: 1 })
      .lean();
    const projectIdFilter = matchingProjects.map((p) => p.id);
    if (!projectIdFilter.length) {
      return res.json({ documents: [], total: 0, page, limit });
    }
    filter.projectId = { $in: projectIdFilter };
  }

  const [items, total] = await Promise.all([
    ProjectDocuments.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ProjectDocuments.countDocuments(filter),
  ]);
  const documents = await enrichList(items);
  res.json({ documents, total, page, limit });
}

async function getProjectDocumentById(req, res) {
  const id = parseIdParam(req.params.id, "id");
  const row = await ProjectDocuments.findOne({ id }).lean();
  if (!row) notFound("Project document");
  const [enriched] = await enrichList([row]);
  res.json({ document: enriched });
}

async function getProjectDocumentByProjectId(req, res) {
  const projectId = parseIdParam(req.params.projectId, "projectId");
  const row = await ProjectDocuments.findOne({ projectId }).lean();
  if (!row) notFound("Project document");
  const [enriched] = await enrichList([row]);
  res.json({ document: enriched });
}

async function createProjectDocument(req, res) {
  const body = req.body ?? {};
  const projectId = Number(body.projectId);
  if (!projectId) badRequest("projectId is required.", "projectId");

  const project = await Projects.findOne({ id: projectId }).select({ id: 1 }).lean();
  if (!project) notFound("Project");

  const existing = await ProjectDocuments.findOne({ projectId }).lean();
  if (existing) badRequest("A document record already exists for this project.", "projectId");

  const fields = encodeFields(normalizeFields(body.fields ?? []));
  const renewals = normalizeRenewals(body.renewals ?? []);

  if (!fields.length && !renewals.length) {
    badRequest("Add at least one field or renewal.", "fields");
  }

  const id = await getNextSequence("project_documents");
  const created = await ProjectDocuments.create({
    id,
    projectId,
    fields,
    renewals,
    createdBy: req.user.id,
    updatedBy: req.user.id,
  });

  const [enriched] = await enrichList([created.toObject()]);
  res.status(201).json({ document: enriched });
}

async function updateProjectDocument(req, res) {
  const id = parseIdParam(req.params.id, "id");
  const row = await ProjectDocuments.findOne({ id }).lean();
  if (!row) notFound("Project document");

  const body = req.body ?? {};
  const hasFields = "fields" in body;
  const hasRenewals = "renewals" in body;
  if (!hasFields && !hasRenewals) {
    badRequest("fields or renewals is required.", "fields");
  }

  const updates = { updatedBy: req.user.id };
  if (hasFields) updates.fields = encodeFields(normalizeFields(body.fields));
  if (hasRenewals) updates.renewals = normalizeRenewals(body.renewals, row.renewals);

  const mergedFields = hasFields ? updates.fields : row.fields ?? [];
  const mergedRenewals = hasRenewals ? updates.renewals : row.renewals ?? [];
  if (!mergedFields.length && !mergedRenewals.length) {
    badRequest("Document must have at least one field or renewal.", "fields");
  }

  const updated = await ProjectDocuments.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true },
  ).lean();

  const [enriched] = await enrichList([updated]);
  res.json({ document: enriched });
}

async function deleteProjectDocument(req, res) {
  const id = parseIdParam(req.params.id, "id");
  const row = await ProjectDocuments.findOne({ id }).lean();
  if (!row) notFound("Project document");
  await ProjectDocuments.deleteOne({ id });
  res.json({ ok: true });
}

async function listProjectsWithoutDocument(req, res) {
  const existingIds = await ProjectDocuments.distinct("projectId");
  const filter = existingIds.length ? { id: { $nin: existingIds } } : {};
  const projects = await Projects.find(filter).sort({ name: 1 }).select({ id: 1, name: 1 }).lean();
  res.json({ projects });
}

export {
  listProjectDocuments,
  getProjectDocumentById,
  getProjectDocumentByProjectId,
  createProjectDocument,
  updateProjectDocument,
  deleteProjectDocument,
  listProjectsWithoutDocument,
};
