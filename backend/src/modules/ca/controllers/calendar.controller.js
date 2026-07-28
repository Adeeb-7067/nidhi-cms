import { getNextSequence, caCalendarEventsTable } from "../../../models/schema/index.js";
import { CA_CALENDAR_CATEGORIES, CA_COMPLIANCE_TIMING } from "../../../constants/ca.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { dateOnly, softDeleteFields } from "../services/helpers.js";

function formatEvent(doc) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    dueDate: dateOnly(doc.dueDate),
    status: doc.status,
    ownerName: doc.ownerName ?? null,
    notes: doc.notes ?? null,
    createdBy: doc.createdBy ?? null,
    createdAt: dateOnly(doc.createdAt),
    updatedAt: dateOnly(doc.updatedAt),
  };
}

export async function listEvents(req, res) {
  const pagination = parsePagination(req.query);
  const query = { isDeleted: false };
  if (req.query.status) query.status = String(req.query.status);
  if (req.query.category) query.category = String(req.query.category);
  if (req.query.search) {
    const q = String(req.query.search).trim();
    if (q) query.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const { items, total, page, limit } = await paginateModel(
    caCalendarEventsTable,
    query,
    pagination,
    { sort: { dueDate: 1 } },
  );

  res.json({ events: items.map(formatEvent), total, page, limit });
}

export async function getEvent(req, res) {
  const id = parseIdParam(req.params.id);
  const doc = await caCalendarEventsTable.findOne({ id, isDeleted: false }).lean();
  if (!doc) notFound("CA calendar event");
  res.json(formatEvent(doc));
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
    if (!category || !CA_CALENDAR_CATEGORIES.includes(category)) {
      badRequest("Valid category is required.", "category");
    }
    out.category = category;
  }
  if (!partial || body.dueDate !== undefined) {
    const due = body.dueDate ? new Date(body.dueDate) : null;
    if (!due || Number.isNaN(due.getTime())) badRequest("dueDate is required.", "dueDate");
    out.dueDate = due;
  }
  if (!partial || body.status !== undefined) {
    const status = optionalString(body.status) ?? "upcoming";
    if (!CA_COMPLIANCE_TIMING.includes(status)) badRequest("Invalid status.", "status");
    out.status = status;
  }
  if (body.ownerName !== undefined) out.ownerName = optionalString(body.ownerName);
  if (body.notes !== undefined) out.notes = optionalString(body.notes);
  return out;
}

export async function createEvent(req, res) {
  const fields = await parseBody(req.body ?? {});
  const id = await getNextSequence("ca_calendar_events");
  const doc = await caCalendarEventsTable.create({
    id,
    ...fields,
    createdBy: req.user.id,
  });
  res.status(201).json(formatEvent(doc.toObject?.() ?? doc));
}

export async function updateEvent(req, res) {
  const id = parseIdParam(req.params.id);
  const existing = await caCalendarEventsTable.findOne({ id, isDeleted: false }).lean();
  if (!existing) notFound("CA calendar event");
  const fields = await parseBody(req.body ?? {}, { partial: true });
  const updated = await caCalendarEventsTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: fields }, { new: true })
    .lean();
  res.json(formatEvent(updated));
}

export async function deleteEvent(req, res) {
  const id = parseIdParam(req.params.id);
  const updated = await caCalendarEventsTable
    .findOneAndUpdate({ id, isDeleted: false }, { $set: softDeleteFields() }, { new: true })
    .lean();
  if (!updated) notFound("CA calendar event");
  res.json({ ok: true, id });
}
