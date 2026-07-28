import {
  getNextSequence,
  caTasksTable,
} from "../../../models/schema/index.js";
import { CA_TASK_PRIORITIES, CA_TASK_STATUSES } from "../../../constants/ca.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly, resolveUserName, resolveUserNames, softDeleteFields } from "../services/helpers.js";

function formatTask(doc, byName, toName) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    assignedById: doc.assignedById ?? null,
    assignedToId: doc.assignedToId ?? null,
    assignedBy: byName ?? doc.assignedByName ?? "—",
    assignedTo: toName ?? doc.assignedToName ?? "—",
    dueDate: dateOnly(doc.dueDate),
    description: doc.description ?? null,
    createdBy: doc.createdBy ?? null,
    createdAt: dateOnly(doc.createdAt),
    updatedAt: dateOnly(doc.updatedAt),
  };
}

export async function listTasks(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.priority) query.priority = String(req.query.priority);
  if (req.query.category) query.category = String(req.query.category);
  if (req.query.search) {
    const q = String(req.query.search).trim();
    if (q) query.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const { items, total, page, limit } = await paginateModel(caTasksTable, query, pagination, {
    sort: { dueDate: 1, updatedAt: -1 },
  });

  const nameMap = await resolveUserNames([
    ...items.map((t) => t.assignedById),
    ...items.map((t) => t.assignedToId),
  ]);

  res.json({
    tasks: items.map((t) =>
      formatTask(t, nameMap.get(t.assignedById), nameMap.get(t.assignedToId)),
    ),
    total,
    page,
    limit,
  });
}

export async function getTask(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await caTasksTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("CA task");
  const [byName, toName] = await Promise.all([
    resolveUserName(doc.assignedById),
    resolveUserName(doc.assignedToId),
  ]);
  res.json(formatTask(doc, byName, toName));
}

async function parseTaskBody(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.title !== undefined) {
    const title = optionalString(body.title);
    if (!title) badRequest("title is required.", "title");
    out.title = title;
  }

  if (!partial || body.category !== undefined) {
    const category = optionalString(body.category);
    if (!category) badRequest("category is required.", "category");
    out.category = category;
  }

  if (!partial || body.status !== undefined) {
    const status = optionalString(body.status) ?? "pending";
    if (!CA_TASK_STATUSES.includes(status)) badRequest("Invalid status.", "status");
    out.status = status;
  }

  if (!partial || body.priority !== undefined) {
    const priority = optionalString(body.priority) ?? "medium";
    if (!CA_TASK_PRIORITIES.includes(priority)) badRequest("Invalid priority.", "priority");
    out.priority = priority;
  }

  if (!partial || body.dueDate !== undefined) {
    if (body.dueDate) {
      const due = new Date(body.dueDate);
      if (Number.isNaN(due.getTime())) badRequest("Invalid dueDate.", "dueDate");
      out.dueDate = due;
    } else if (!partial) {
      out.dueDate = null;
    } else {
      out.dueDate = null;
    }
  }

  if (body.description !== undefined) {
    out.description = optionalString(body.description);
  }

  if (body.assignedById !== undefined || body.assignedByName !== undefined) {
    const assignedById = body.assignedById != null ? Number(body.assignedById) : null;
    out.assignedById = Number.isFinite(assignedById) ? assignedById : null;
    out.assignedByName =
      optionalString(body.assignedByName) ?? (await resolveUserName(out.assignedById));
  }

  if (body.assignedToId !== undefined || body.assignedToName !== undefined) {
    const assignedToId = body.assignedToId != null ? Number(body.assignedToId) : null;
    out.assignedToId = Number.isFinite(assignedToId) ? assignedToId : null;
    out.assignedToName =
      optionalString(body.assignedToName) ?? (await resolveUserName(out.assignedToId));
  }

  return out;
}

export async function createTask(req, res) {
  const body = req.body ?? {};
  const fields = await parseTaskBody(body);
  if (!fields.assignedById && !fields.assignedByName) {
    fields.assignedById = req.user.id;
    fields.assignedByName = req.user.name ?? (await resolveUserName(req.user.id));
  }
  const id = await getNextSequence("ca_tasks");
  const doc = await caTasksTable.create({
    id,
    ...fields,
    createdBy: req.user.id,
  });
  res.status(201).json(formatTask(doc.toObject?.() ?? doc, fields.assignedByName, fields.assignedToName));
}

export async function updateTask(req, res) {
  const id = parseIdParam(req.params.id);
  const existing = await caTasksTable.findOne({ id, isDeleted: false }).lean();
  if (!existing) notFound("CA task");
  const fields = await parseTaskBody(req.body ?? {}, { partial: true });
  const updated = await caTasksTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: fields }, { new: true })
    .lean();
  const [byName, toName] = await Promise.all([
    resolveUserName(updated.assignedById),
    resolveUserName(updated.assignedToId),
  ]);
  res.json(formatTask(updated, byName ?? updated.assignedByName, toName ?? updated.assignedToName));
}

export async function deleteTask(req, res) {
  const id = parseIdParam(req.params.id);
  const updated = await caTasksTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: softDeleteFields() }, { new: true })
    .lean();
  if (!updated) notFound("CA task");
  res.json({ ok: true, id });
}
