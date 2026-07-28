import { isDeveloperRole } from "../../../constants/user-roles.js";
import {
  resourceRequestsTable,
  usersTable,
  notificationsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { notifyUser, broadcast } from "../../../lib/realtime.js";
import { formatRequestRow, formatRequestRows } from "../../../mappers/request-format.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { logger } from "../../../lib/logger.js";
import {
  badRequest,
  forbidden,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../../../utils/route-errors.js";
import { getAccessibleProjectIds, applyIdScope } from "../../access/services/list-scope.js";
import { userHasPermission } from "../../identity/services/permissions.service.js";
import { assertProjectAccess } from "../../access/services/access-helpers.js";

async function canViewAllRequests(user) {
  if (user.role === "super_admin") return true;
  return userHasPermission(user.id, "admin_requests", "view");
}

async function assertCanAccessRequest(req, request) {
  if (await canViewAllRequests(req.user)) return;
  if (request.developerId === req.user.id) return;
  const projectIds = await getAccessibleProjectIds(req.user);
  if (projectIds === null) {
    forbidden("You cannot access this request.");
  }
  if (projectIds.includes(Number(request.projectId))) return;
  forbidden("You cannot access this request.");
}

async function buildRequestsScopeQuery(user) {
  const query = {};
  if (!(await canViewAllRequests(user))) {
    if (isDeveloperRole(user.role) || user.role === "client") {
      query.developerId = user.id;
    } else {
      const projectIds = await getAccessibleProjectIds(user);
      if (projectIds === null) {
        query.developerId = user.id;
      } else if (!applyIdScope(query, "projectId", projectIds)) {
        return null;
      }
    }
  }
  return query;
}

async function getRequests(req, res) {
  const { status, projectId } = req.query;
  const pagination = parsePagination(req.query);
  const query = await buildRequestsScopeQuery(req.user);
  if (query === null) {
    res.json({ requests: [], total: 0, page: pagination.page, limit: pagination.limit });
    return;
  }

  if (status) query.status = status;
  if (projectId) {
    const pid = parseInt(projectId, 10);
    if (query.projectId?.$in && !query.projectId.$in.includes(pid)) {
      res.json({ requests: [], total: 0, page: pagination.page, limit: pagination.limit });
      return;
    }
    query.projectId = pid;
  }
  const { items, total, page, limit } = await paginateModel(resourceRequestsTable, query, pagination);
  const requests = await formatRequestRows(items);
  res.json({ requests, total, page, limit });
}

async function getRequestsSummary(req, res) {
  const scope = await buildRequestsScopeQuery(req.user);
  if (scope === null) {
    res.json({ total: 0, pending: 0, approved: 0, rejected: 0 });
    return;
  }

  const [row] = await resourceRequestsTable.aggregate([
    { $match: scope },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
      },
    },
  ]);

  res.json({
    total: row?.total ?? 0,
    pending: row?.pending ?? 0,
    approved: row?.approved ?? 0,
    rejected: row?.rejected ?? 0,
  });
}

async function postRequests(req, res) {
  const body = req.body;
  const projectId = Number(body.projectId);
  const type = optionalString(body.type);
  const title = optionalString(body.title);
  const description = optionalString(body.description);
  const urgency = optionalString(body.urgency);
  if (!Number.isFinite(projectId) || projectId < 1) badRequest("Project is required.", "projectId");
  if (!type) badRequest("Request type is required.", "type");
  if (!title) badRequest("Title is required.", "title");
  if (!description) badRequest("Description is required.", "description");
  if (!urgency) badRequest("Urgency is required.", "urgency");
  await assertProjectAccess(req, projectId);
  const nextId = await getNextSequence("resource_requests");
  const request = await resourceRequestsTable.create({
    id: nextId,
    developerId: req.user.id,
    projectId,
    type,
    title,
    description,
    urgency,
  });
  const formatted = await formatRequestRow(request);
  try {
    const admins = await usersTable.find({ role: "super_admin", status: "active" }, { id: 1 }).lean();
    const requestLabel = type === "add_on_work" ? "Add-on Work" : "Resource";
    const requesterName = req.user.name;
    await Promise.all(
      admins.map(async (admin) => {
        const notifId = await getNextSequence("notifications");
        await notificationsTable.create({
          id: notifId,
          userId: admin.id,
          type: "request",
          title: `New ${requestLabel} Request`,
          body: `${requesterName} submitted: "${title}"`,
          entityType: "request",
          entityId: nextId,
          isRead: false,
        });
        notifyUser(admin.id, "notification", {
          type: "request",
          title: `New ${requestLabel} Request`,
          body: `${requesterName} submitted: "${title}"`,
        });
      }),
    );
    broadcast("request_update", { id: nextId });
  } catch (err) {
    logger.warn({ err, requestId: nextId }, "Failed to notify admins about new request");
  }
  res.status(201).json(formatted);
}

async function getRequestsById(req, res) {
  const id = parseIdParam(req.params.id, "request id");
  const r = await resourceRequestsTable.findOne({ id }).lean();
  if (!r) notFound("Request");
  await assertCanAccessRequest(req, r);
  res.json(await formatRequestRow(r));
}

async function patchRequestsById(req, res) {
  const id = parseIdParam(req.params.id, "request id");
  const status = optionalString(req.body.status);
  const adminNote = req.body.adminNote;
  const r = await resourceRequestsTable.findOneAndUpdate(
    { id },
    { $set: { status, adminNote } },
    { new: true },
  );
  if (!r) notFound("Request");
  const formatted = await formatRequestRow(r);
  if (status) {
    try {
      const notifId = await getNextSequence("notifications");
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
      await notificationsTable.create({
        id: notifId,
        userId: r.developerId,
        type: "request",
        title: `Request ${statusLabel}`,
        body: `Your request "${r.title}" has been ${status}`,
        entityType: "request",
        entityId: r.id,
        isRead: false,
      });
      notifyUser(r.developerId, "notification", {
        type: "request",
        title: `Request ${statusLabel}`,
        body: `Your request "${r.title}" has been ${status}`,
      });
      broadcast("request_update", { id: r.id });
    } catch (err) {
      logger.warn({ err, requestId: id }, "Failed to notify user about request status change");
    }
  }
  res.json(formatted);
}

export {
  getRequests,
  getRequestsSummary,
  getRequestsById,
  patchRequestsById,
  postRequests,
};
