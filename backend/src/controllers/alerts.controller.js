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
    out.targetUserIds = [];
    out.targetRoles = [];

    if (audienceType === "user") {
      const userIds = normalizeUserIds(body.targetUserIds, body.targetUserId);
      if (userIds.length === 0) {
        badRequest("Select at least one user to target.", "targetUserIds");
      }
      const found = await usersTable.find({ id: { $in: userIds } }, { id: 1 }).lean();
      const foundIds = new Set(found.map((u) => u.id));
      const missing = userIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        badRequest(`Some selected users were not found: ${missing.join(", ")}.`, "targetUserIds");
      }
      out.targetUserIds = userIds;
    } else if (audienceType === "role") {
      const roles = normalizeRoles(body.targetRoles, body.targetRole);
      if (roles.length === 0) {
        badRequest("Select at least one role to target.", "targetRoles");
      }
      const invalid = roles.filter((r) => !ASSIGNABLE_ROLE_VALUES.includes(r));
      if (invalid.length > 0) {
        badRequest(`Some selected roles are invalid: ${invalid.join(", ")}.`, "targetRoles");
      }
      out.targetRoles = roles;
    }
  }

  return out;
}

/** Accept a targetUserIds array, falling back to a legacy single targetUserId. */
function normalizeUserIds(rawList, legacySingle) {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : [legacySingle];
  const ids = source
    .map((v) => Number.parseInt(String(v ?? ""), 10))
    .filter((v) => Number.isFinite(v));
  return [...new Set(ids)];
}

/** Accept a targetRoles array, falling back to a legacy single targetRole. */
function normalizeRoles(rawList, legacySingle) {
  const source = Array.isArray(rawList) && rawList.length > 0 ? rawList : [legacySingle];
  const roles = source.map((v) => optionalString(v)).filter((v) => Boolean(v));
  return [...new Set(roles)];
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
