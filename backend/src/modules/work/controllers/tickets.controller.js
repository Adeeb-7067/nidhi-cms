import {
  ticketsTable,
  getNextSequence,
  usersTable,
  auditLogsTable,
  notificationsTable
} from "../../../models/schema/index.js";
import { notifyUser, broadcast } from "../../../lib/realtime.js";
import { validateStoredFileUrls } from "../../../lib/file-storage.js";
import { formatTicketRow, formatTicketRows } from "../../../mappers/ticket-format.js";
import { paginateModel } from "../../../utils/mongo-list.js";
import { logger } from "../../../lib/logger.js";
import {
  badRequest,
  notFound,
  forbidden,
  parseIdParam,
  parsePagination,
  optionalString
} from "../../../utils/route-errors.js";
import {
  ticketAudienceFromRole,
  buildTicketListFilter,
} from "../services/ticket-support.js";

function combineFilters(andClauses) {
  const parts = andClauses.filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}

async function getTickets(req, res) {
  const { status, priority, projectId, search, audience } = req.query;
  const pagination = parsePagination(req.query);
  const and = await buildTicketListFilter(req.user, { audience });

  if (status) and.push({ status });
  if (priority) and.push({ priority });
  if (projectId) and.push({ projectId: parseInt(projectId, 10) });

  if (search?.trim()) {
    const q = search.trim();
    and.push({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    });
  }

  const query = combineFilters(and);
  const { items, total, page, limit } = await paginateModel(ticketsTable, query, pagination);
  const tickets = await formatTicketRows(items);
  res.json({ tickets, total, page, limit });
}

async function postTickets(req, res) {
  const body = req.body;
  const title = optionalString(body.title);
  const description = optionalString(body.description);
  if (!title) badRequest("Title is required.", "title");
  if (!description) badRequest("Description is required.", "description");
  const attachmentList = Array.isArray(body.attachments) ? body.attachments : [];
  validateStoredFileUrls(attachmentList, "attachments");
  const nextId = await getNextSequence("tickets");
  const audience = ticketAudienceFromRole(req.user.role);
  const ticket = await ticketsTable.create({
    id: nextId,
    projectId: body.projectId ? parseInt(String(body.projectId), 10) : null,
    creatorId: req.user.id,
    audience,
    assignedTo: body.assignedTo ? parseInt(String(body.assignedTo), 10) : null,
    title,
    description,
    priority: optionalString(body.priority) ?? "medium",
    status: "open",
    attachments: attachmentList
  });
  const auditId = await getNextSequence("audit_logs");
  await auditLogsTable.create({
    id: auditId,
    actorId: req.user.id,
    action: "create_ticket",
    entityType: "ticket",
    entityId: ticket.id,
    newVal: ticket.toObject(),
    ipAddress: req.ip
  });
  if (ticket.assignedTo) {
    const notifId = await getNextSequence("notifications");
    await notificationsTable.create({
      id: notifId,
      userId: ticket.assignedTo,
      type: "ticket_assigned",
      title: "New Ticket Assigned",
      body: `You have been assigned to ticket: ${ticket.title}`,
      entityType: "ticket",
      entityId: ticket.id,
      projectId: ticket.projectId ?? null,
      isRead: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    notifyUser(ticket.assignedTo, "notification", {
      type: "ticket_assigned",
      title: "New Ticket Assigned",
      body: `You have been assigned to ticket: ${ticket.title}`,
      entityType: "ticket",
      entityId: ticket.id,
      projectId: ticket.projectId ?? null
    });
  }
  try {
    const admins = await usersTable.find({ role: "super_admin", status: "active" });
    await Promise.all(admins.filter((a) => a.id !== req.user.id).map(async (admin) => {
      const nId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: nId,
        userId: admin.id,
        type: "ticket_created",
        title: "New Ticket Raised",
        body: `${req.user.name} raised: "${ticket.title}"`,
        entityType: "ticket",
        entityId: ticket.id,
        projectId: ticket.projectId ?? null,
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(admin.id, "notification", {
        type: "ticket_created",
        title: "New Ticket Raised",
        body: `${req.user.name} raised: "${ticket.title}"`,
        entityType: "ticket",
        entityId: ticket.id,
        projectId: ticket.projectId ?? null
      });
    }));
  } catch (err) {
    logger.warn({ err, ticketId: ticket.id }, "Failed to notify admins about ticket");
  }
  broadcast("ticket_update", { id: ticket.id });
  res.status(201).json(await formatTicketRow(ticket));
}

async function patchTicketsById(req, res) {
  const id = parseIdParam(req.params.id, "ticket id");
  const body = req.body;
  if (body.attachments !== void 0) {
    const attachmentList = Array.isArray(body.attachments) ? body.attachments : [];
    validateStoredFileUrls(attachmentList, "attachments");
  }
  const oldTicket = await ticketsTable.findOne({ id });
  if (!oldTicket) notFound("Ticket");
  if (req.user.role !== "super_admin" && oldTicket.creatorId !== req.user.id) {
    forbidden("Only the ticket creator or an administrator can update this ticket.");
  }
  if (
    req.user.role !== "super_admin" &&
    (body.status || body.assignedTo !== undefined || body.priority)
  ) {
    forbidden("Only administrators can change status, priority, or assignment.");
  }
  const updates = {};
  if (optionalString(body.status)) updates.status = optionalString(body.status);
  if (optionalString(body.priority)) updates.priority = optionalString(body.priority);
  if (body.assignedTo !== void 0) {
    updates.assignedTo = body.assignedTo ? parseInt(String(body.assignedTo), 10) : null;
  }
  const title = optionalString(body.title);
  if (title) updates.title = title;
  const description = optionalString(body.description);
  if (description) updates.description = description;
  if (body.attachments !== void 0) {
    updates.attachments = Array.isArray(body.attachments) ? body.attachments : [];
  }
  const ticket = await ticketsTable.findOneAndUpdate({ id }, { $set: updates }, { new: true });
  const auditId = await getNextSequence("audit_logs");
  await auditLogsTable.create({
    id: auditId,
    actorId: req.user.id,
    action: "update_ticket",
    entityType: "ticket",
    entityId: id,
    oldVal: oldTicket.toObject(),
    newVal: ticket.toObject(),
    ipAddress: req.ip
  });
  if (body.status && body.status !== oldTicket.status) {
    const status = String(body.status);
    const notifId = await getNextSequence("notifications");
    await notificationsTable.create({
      id: notifId,
      userId: ticket.creatorId,
      type: "ticket_status_change",
      title: "Ticket Status Updated",
      body: `Your ticket "${ticket.title}" status is now ${status}`,
      entityType: "ticket",
      entityId: id,
      projectId: ticket.projectId ?? null,
      isRead: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    notifyUser(ticket.creatorId, "notification", {
      type: "ticket_status_change",
      title: "Ticket Status Updated",
      body: `Your ticket "${ticket.title}" status is now ${status}`,
      entityType: "ticket",
      entityId: id,
      projectId: ticket.projectId ?? null
    });
  }
  broadcast("ticket_update", { id });
  res.json(await formatTicketRow(ticket));
}

async function getTicketsSummary(req, res) {
  const { audience } = req.query;
  const and = await buildTicketListFilter(req.user, { audience });
  const match = combineFilters(and);

  const [row] = await ticketsTable.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
      },
    },
  ]);

  res.json({
    total: row?.total ?? 0,
    open: row?.open ?? 0,
    pending: row?.pending ?? 0,
    resolved: row?.resolved ?? 0,
    closed: row?.closed ?? 0,
    urgent: row?.urgent ?? 0,
    high: row?.high ?? 0,
  });
}

export {
  getTickets,
  getTicketsSummary,
  patchTicketsById,
  postTickets
};
