import { Router } from "express";
import {
  resourceRequestsTable,
  usersTable,
  notificationsTable,
  getNextSequence,
} from "@workspace/db/schema";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser, broadcast } from "../lib/realtime";
import { formatRequestRow, formatRequestRows } from "../lib/request-format";
import { paginateModel } from "../lib/mongo-list";
import { logger } from "../lib/logger";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString,
} from "../lib/route-errors";

const router = Router();

// GET /api/requests
router.get("/requests", requireAuth, async (req, res) => {
  const { status, projectId } = req.query as Record<string, string>;
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const query: Record<string, unknown> = {};
  if (req.user!.role === "developer" || req.user!.role === "client") {
    query.developerId = req.user!.id;
  }
  if (status) query.status = status;
  if (projectId) query.projectId = parseInt(projectId, 10);

  const { items, total, page, limit } = await paginateModel(resourceRequestsTable, query, pagination);
  const requests = await formatRequestRows(items as unknown as Parameters<typeof formatRequestRows>[0]);

  res.json({ requests, total, page, limit });
});

// POST /api/requests
router.post("/requests", requireAuth, async (req, res) => {
  const body = req.body as Record<string, unknown>;
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

  const nextId = await getNextSequence("resource_requests");
  const request = await resourceRequestsTable.create({
    id: nextId,
    developerId: req.user!.id,
    projectId,
    type,
    title,
    description,
    urgency,
  });

  const formatted = await formatRequestRow(request as unknown as Parameters<typeof formatRequestRow>[0]);

  try {
    const admins = await usersTable
      .find({ role: "super_admin", status: "active" }, { id: 1 })
      .lean();
    const requestLabel = type === "add_on_work" ? "Add-on Work" : "Resource";
    const requesterName = req.user!.name;

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
});

// GET /api/requests/:id
router.get("/requests/:id", requireAuth, async (req, res) => {
  const id = parseIdParam(req.params.id, "request id");
  const r = await resourceRequestsTable.findOne({ id }).lean();
  if (!r) notFound("Request");
  res.json(await formatRequestRow(r as unknown as unknown as Parameters<typeof formatRequestRow>[0]));
});

// PATCH /api/requests/:id
router.patch("/requests/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  const id = parseIdParam(req.params.id, "request id");
  const status = optionalString((req.body as { status?: string }).status);
  const adminNote = (req.body as { adminNote?: string }).adminNote;

  const r = await resourceRequestsTable.findOneAndUpdate(
    { id },
    { $set: { status, adminNote } },
    { new: true },
  );

  if (!r) notFound("Request");

  const formatted = await formatRequestRow(r as unknown as Parameters<typeof formatRequestRow>[0]);

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
});

export default router;
