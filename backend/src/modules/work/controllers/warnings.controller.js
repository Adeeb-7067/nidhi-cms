import {
  warningsTable,
  usersTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { formatWarningRow, formatWarningRows } from "../../../mappers/warning-format.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";

function parseDayStart(raw, field) {
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) {
    badRequest(`A valid ${field} is required.`, field);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDayEnd(raw, field) {
  const d = raw ? new Date(raw) : null;
  if (!d || Number.isNaN(d.getTime())) {
    badRequest(`A valid ${field} is required.`, field);
  }
  d.setHours(23, 59, 59, 999);
  return d;
}

async function validateWarningInput(body, { partial = false } = {}) {
  const out = {};

  const title = optionalString(body.title);
  if (!partial || body.title !== undefined) {
    if (!title) badRequest("Title is required.", "title");
    out.title = title;
  }

  const description = optionalString(body.description);
  if (!partial || body.description !== undefined) {
    if (!description) badRequest("Description is required.", "description");
    out.description = description;
  }

  if (!partial || body.targetUserId !== undefined) {
    const targetUserId = Number.parseInt(String(body.targetUserId ?? ""), 10);
    if (!Number.isFinite(targetUserId)) {
      badRequest("Select an employee to warn.", "targetUserId");
    }
    const user = await usersTable.findOne({ id: targetUserId }, { id: 1, role: 1 }).lean();
    if (!user) badRequest("Selected employee was not found.", "targetUserId");
    if (user.role === "super_admin") {
      badRequest("A super admin cannot be given a warning.", "targetUserId");
    }
    out.targetUserId = targetUserId;
  }

  if (!partial || body.startDate !== undefined) {
    out.startDate = parseDayStart(body.startDate, "startDate");
  }
  if (!partial || body.endDate !== undefined) {
    out.endDate = parseDayEnd(body.endDate, "endDate");
  }

  // When both endpoints of the window are present, enforce ordering.
  if (out.startDate && out.endDate && out.endDate.getTime() < out.startDate.getTime()) {
    badRequest("End date must be on or after the start date.", "endDate");
  }

  return out;
}

async function getWarnings(req, res) {
  const pagination = parsePagination(req.query);
  const filter = {};
  if (req.query.targetUserId != null && req.query.targetUserId !== "") {
    const targetUserId = Number.parseInt(String(req.query.targetUserId), 10);
    if (Number.isFinite(targetUserId)) filter.targetUserId = targetUserId;
  }
  if (req.query.status) filter.status = req.query.status;
  const { items, total, page, limit } = await paginateModel(warningsTable, filter, pagination, {
    sort: { createdAt: -1 },
  });
  const warnings = await formatWarningRows(items);
  res.json({ warnings, total, page, limit });
}

async function postWarnings(req, res) {
  const fields = await validateWarningInput(req.body);
  // Both dates are required on create even though the validator treats them as
  // optional for the shared partial-update path.
  if (!fields.startDate) badRequest("A valid startDate is required.", "startDate");
  if (!fields.endDate) badRequest("A valid endDate is required.", "endDate");
  const id = await getNextSequence("warnings");
  const warning = await warningsTable.create({
    id,
    ...fields,
    status: "active",
    createdBy: req.user.id,
  });
  res.status(201).json(await formatWarningRow(warning));
}

async function patchWarningsById(req, res) {
  const id = parseIdParam(req.params.id, "warning id");
  const existing = await warningsTable.findOne({ id });
  if (!existing) notFound("Warning");
  const fields = await validateWarningInput(req.body, { partial: true });
  // Guard against an update that would leave endDate before startDate.
  const nextStart = fields.startDate ?? existing.startDate;
  const nextEnd = fields.endDate ?? existing.endDate;
  if (nextEnd.getTime() < nextStart.getTime()) {
    badRequest("End date must be on or after the start date.", "endDate");
  }
  const warning = await warningsTable.findOneAndUpdate({ id }, { $set: fields }, { new: true });
  res.json(await formatWarningRow(warning));
}

async function deleteWarningsById(req, res) {
  const id = parseIdParam(req.params.id, "warning id");
  const existing = await warningsTable.findOne({ id });
  if (!existing) notFound("Warning");
  // Soft-revoke so the record is preserved for history but stops displaying.
  await warningsTable.updateOne({ id }, { $set: { status: "revoked" } });
  res.json({ message: "Warning revoked" });
}

async function getMyWarnings(req, res) {
  const now = new Date();
  const rows = await warningsTable
    .find({
      targetUserId: req.user.id,
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
    .sort({ startDate: -1 })
    .lean();
  res.json({
    warnings: rows.map((w) => ({
      id: w.id,
      title: w.title,
      description: w.description,
      startDate: w.startDate ? new Date(w.startDate).toISOString() : null,
      endDate: w.endDate ? new Date(w.endDate).toISOString() : null,
    })),
  });
}

export {
  getWarnings,
  postWarnings,
  patchWarningsById,
  deleteWarningsById,
  getMyWarnings,
};
