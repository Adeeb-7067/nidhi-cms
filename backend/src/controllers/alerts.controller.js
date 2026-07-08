import {
  alertsTable,
  alertDeliveriesTable,
  getNextSequence,
  usersTable,
  alertAudienceTypes
} from "../models/schema/index.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import { paginateModel } from "../utils/mongo-list.js";
import { formatAlertRow, formatAlertRows } from "../mappers/alert-format.js";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString
} from "../utils/route-errors.js";
import { builtInAssignableCmsRoles } from "../constants/permissions.js";

const ASSIGNABLE_ROLE_VALUES = builtInAssignableCmsRoles.map((r) => r.value);

async function validateAlertInput(body, { partial = false } = {}) {
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

  if (!partial || body.photoUrl !== undefined) {
    const photoUrl = optionalString(body.photoUrl) ?? null;
    if (photoUrl) validateStoredFileUrl(photoUrl, "photoUrl");
    out.photoUrl = photoUrl;
  }

  if (!partial || body.scheduledAt !== undefined) {
    const raw = body.scheduledAt;
    const scheduledAt = raw ? new Date(raw) : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      badRequest("A valid scheduled date and time is required.", "scheduledAt");
    }
    if (scheduledAt.getTime() <= Date.now()) {
      badRequest("Scheduled date and time must be in the future.", "scheduledAt");
    }
    out.scheduledAt = scheduledAt;
  }

  if (!partial || body.audienceType !== undefined) {
    const audienceType = optionalString(body.audienceType);
    if (!audienceType || !alertAudienceTypes.includes(audienceType)) {
      badRequest("Audience type must be one of: user, role, all.", "audienceType");
    }
    out.audienceType = audienceType;
    out.targetUserId = null;
    out.targetRole = null;

    if (audienceType === "user") {
      const targetUserId = Number.parseInt(String(body.targetUserId ?? ""), 10);
      if (!Number.isFinite(targetUserId)) {
        badRequest("Select a user to target.", "targetUserId");
      }
      const user = await usersTable.findOne({ id: targetUserId }, { id: 1 }).lean();
      if (!user) badRequest("Selected user was not found.", "targetUserId");
      out.targetUserId = targetUserId;
    } else if (audienceType === "role") {
      const targetRole = optionalString(body.targetRole);
      if (!targetRole || !ASSIGNABLE_ROLE_VALUES.includes(targetRole)) {
        badRequest("Select a valid role to target.", "targetRole");
      }
      out.targetRole = targetRole;
    }
  }

  return out;
}

async function getAlerts(req, res) {
  const pagination = parsePagination(req.query);
  const { status } = req.query;
  const filter = status ? { status } : {};
  const { items, total, page, limit } = await paginateModel(alertsTable, filter, pagination, {
    sort: { scheduledAt: -1 },
  });
  const alerts = await formatAlertRows(items);
  res.json({ alerts, total, page, limit });
}

async function postAlerts(req, res) {
  const fields = await validateAlertInput(req.body);
  const id = await getNextSequence("alerts");
  const alert = await alertsTable.create({
    id,
    ...fields,
    status: "scheduled",
    createdBy: req.user.id,
  });
  res.status(201).json(await formatAlertRow(alert));
}

async function patchAlertsById(req, res) {
  const id = parseIdParam(req.params.id, "alert id");
  const existing = await alertsTable.findOne({ id });
  if (!existing) notFound("Alert");
  if (existing.status !== "scheduled") {
    badRequest("Only alerts that haven't fired yet can be edited.", "status");
  }
  const fields = await validateAlertInput(req.body, { partial: true });
  const alert = await alertsTable.findOneAndUpdate({ id }, { $set: fields }, { new: true });
  res.json(await formatAlertRow(alert));
}

async function deleteAlertsById(req, res) {
  const id = parseIdParam(req.params.id, "alert id");
  const existing = await alertsTable.findOne({ id });
  if (!existing) notFound("Alert");
  if (existing.status !== "scheduled") {
    badRequest("Only alerts that haven't fired yet can be cancelled.", "status");
  }
  await alertsTable.updateOne({ id }, { $set: { status: "cancelled" } });
  res.json({ message: "Alert cancelled" });
}

async function getAlertsPending(req, res) {
  const deliveries = await alertDeliveriesTable
    .find({ userId: req.user.id, dismissedAt: null })
    .lean();
  if (deliveries.length === 0) {
    res.json({ alerts: [] });
    return;
  }
  const alertIds = deliveries.map((d) => d.alertId);
  const alerts = await alertsTable
    .find({ id: { $in: alertIds } }, { id: 1, title: 1, description: 1, photoUrl: 1 })
    .lean();
  res.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      photoUrl: a.photoUrl ?? null,
    })),
  });
}

async function postAlertsDismiss(req, res) {
  const id = parseIdParam(req.params.id, "alert id");
  await alertDeliveriesTable.updateOne(
    { alertId: id, userId: req.user.id },
    { $set: { dismissedAt: new Date() } }
  );
  res.json({ message: "Alert dismissed" });
}

export {
  getAlerts,
  postAlerts,
  patchAlertsById,
  deleteAlertsById,
  getAlertsPending,
  postAlertsDismiss,
};
