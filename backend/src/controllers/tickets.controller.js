import {
  ticketsTable,
  getNextSequence,
  usersTable,
  projectMembersTable,
  auditLogsTable,
  notificationsTable
} from "@/models/schema";
import { notifyUser, broadcast } from "@/lib/realtime";
import { validateStoredFileUrls } from "@/lib/file-storage";
import { formatTicketRow, formatTicketRows } from "@/mappers/ticket-format";
import { paginateModel } from "@/utils/mongo-list";
import { logger } from "@/lib/logger";
import {
  badRequest,
  notFound,
  parseIdParam,
  parsePagination,
  optionalString
} from "@/utils/route-errors";
async function getTickets(req, res) {
  const { status, priority, projectId, search } = req.query;
  const pagination = parsePagination(req.query);
  const query = {};
  if (req.user.role === "client") {
    query.creatorId = req.user.id;
  } else if (req.user.role === "developer" || req.user.role === "tester") {
    const memberRows = await projectMembersTable.find({ userId: req.user.id }, { projectId: 1 }).lean();
    const projectIds = memberRows.map((m) => m.projectId);
    query.$or = [{ assignedTo: req.user.id }, { projectId: { $in: projectIds } }];
  }
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (projectId) query.projectId = parseInt(projectId, 10);
  if (search?.trim()) {
    const searchClause = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } }
    ];
    query.$or = query.$or ? [...query.$or, ...searchClause] : searchClause;
  }
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
  const ticket = await ticketsTable.create({
    id: nextId,
    projectId: body.projectId ? parseInt(String(body.projectId), 10) : null,
    creatorId: req.user.id,
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
      isRead: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    notifyUser(ticket.assignedTo, "notification", {
      type: "ticket_assigned",
      title: "New Ticket Assigned",
      body: `You have been assigned to ticket: ${ticket.title}`,
      entityType: "ticket",
      entityId: ticket.id
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
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(admin.id, "notification", {
        type: "ticket_created",
        title: "New Ticket Raised",
        body: `${req.user.name} raised: "${ticket.title}"`
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
      isRead: false,
      createdAt: /* @__PURE__ */ new Date()
    });
    notifyUser(ticket.creatorId, "notification", {
      type: "ticket_status_change",
      title: "Ticket Status Updated",
      body: `Your ticket "${ticket.title}" status is now ${status}`,
      entityType: "ticket",
      entityId: id
    });
  }
  broadcast("ticket_update", { id });
  res.json(await formatTicketRow(ticket));
}
export {
  getTickets,
  patchTicketsById,
  postTickets
};
