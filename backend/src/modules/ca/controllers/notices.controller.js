import { getNextSequence, caNoticesTable } from "../../../models/schema/index.js";
import { CA_NOTICE_DEPARTMENTS, CA_NOTICE_WORKFLOW } from "../../../constants/ca.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly, resolveUserName, resolveUserNames, softDeleteFields } from "../services/helpers.js";

function formatNotice(doc, assigneeName) {
  return {
    id: doc.id,
    department: doc.department,
    reference: doc.reference,
    subject: doc.subject,
    receivedAt: dateOnly(doc.receivedAt),
    dueDate: dateOnly(doc.dueDate),
    workflowStatus: doc.workflowStatus,
    assignedToId: doc.assignedToId ?? null,
    assignedTo: assigneeName ?? doc.assignedToName ?? "—",
    replyNotes: doc.replyNotes ?? null,
    createdBy: doc.createdBy ?? null,
    createdAt: dateOnly(doc.createdAt),
    updatedAt: dateOnly(doc.updatedAt),
  };
}

export async function listNotices(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  if (req.query.workflowStatus) query.workflowStatus = String(req.query.workflowStatus);
  if (req.query.department) query.department = String(req.query.department);
  if (req.query.search) {
    const q = String(req.query.search).trim();
    if (q) {
      const rx = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
      query.$or = [{ reference: rx }, { subject: rx }];
    }
  }

  const { items, total, page, limit } = await paginateModel(caNoticesTable, query, pagination, {
    sort: { dueDate: 1, receivedAt: -1 },
  });

  const nameMap = await resolveUserNames(items.map((n) => n.assignedToId));
  res.json({
    notices: items.map((n) => formatNotice(n, nameMap.get(n.assignedToId))),
    total,
    page,
    limit,
  });
}

export async function getNotice(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await caNoticesTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("CA notice");
  res.json(formatNotice(doc, await resolveUserName(doc.assignedToId)));
}

async function parseBody(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.department !== undefined) {
    const department = optionalString(body.department);
    if (!department || !CA_NOTICE_DEPARTMENTS.includes(department)) {
      badRequest("Valid department is required.", "department");
    }
    out.department = department;
  }
  if (!partial || body.reference !== undefined) {
    const reference = optionalString(body.reference);
    if (!reference) badRequest("reference is required.", "reference");
    out.reference = reference;
  }
  if (!partial || body.subject !== undefined) {
    const subject = optionalString(body.subject);
    if (!subject) badRequest("subject is required.", "subject");
    out.subject = subject;
  }
  if (!partial || body.receivedAt !== undefined) {
    const d = body.receivedAt ? new Date(body.receivedAt) : null;
    if (!d || Number.isNaN(d.getTime())) badRequest("receivedAt is required.", "receivedAt");
    out.receivedAt = d;
  }
  if (!partial || body.dueDate !== undefined) {
    const d = body.dueDate ? new Date(body.dueDate) : null;
    if (!d || Number.isNaN(d.getTime())) badRequest("dueDate is required.", "dueDate");
    out.dueDate = d;
  }
  if (!partial || body.workflowStatus !== undefined) {
    const workflowStatus = optionalString(body.workflowStatus) ?? "received";
    if (!CA_NOTICE_WORKFLOW.includes(workflowStatus)) {
      badRequest("Invalid workflowStatus.", "workflowStatus");
    }
    out.workflowStatus = workflowStatus;
  }
  if (body.assignedToId !== undefined || body.assignedToName !== undefined) {
    const assignedToId = body.assignedToId != null ? Number(body.assignedToId) : null;
    out.assignedToId = Number.isFinite(assignedToId) ? assignedToId : null;
    out.assignedToName =
      optionalString(body.assignedToName) ?? (await resolveUserName(out.assignedToId));
  }
  if (body.replyNotes !== undefined) out.replyNotes = optionalString(body.replyNotes);
  return out;
}

export async function createNotice(req, res) {
  const fields = await parseBody(req.body ?? {});
  const id = await getNextSequence("ca_notices");
  const doc = await caNoticesTable.create({
    id,
    ...fields,
    createdBy: req.user.id,
  });
  res.status(201).json(formatNotice(doc.toObject?.() ?? doc, fields.assignedToName));
}

export async function updateNotice(req, res) {
  const id = parseIdParam(req.params.id);
  const existing = await caNoticesTable.findOne({ id, isDeleted: false }).lean();
  if (!existing) notFound("CA notice");
  const fields = await parseBody(req.body ?? {}, { partial: true });
  const updated = await caNoticesTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: fields }, { new: true })
    .lean();
  res.json(formatNotice(updated, await resolveUserName(updated.assignedToId)));
}

export async function deleteNotice(req, res) {
  const id = parseIdParam(req.params.id);
  const updated = await caNoticesTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: softDeleteFields() }, { new: true })
    .lean();
  if (!updated) notFound("CA notice");
  res.json({ ok: true, id });
}
