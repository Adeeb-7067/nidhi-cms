import {
  SalesFollowUps,
  SalesInvoices,
  SalesPayments,
  SalesLeads,
  SalesProposals,
  notificationsTable,
  getNextSequence,
} from "../../models/schema/index.js";
import { parsePagination, badRequest, notFound, parseIdParam } from "../../utils/route-errors.js";
import {
  formatNotificationRow,
  NOTIFICATION_LIST_PROJECTION,
  unreadNotificationFilter,
} from "../../mappers/notification-format.js";
import { SalesPreferences } from "../../models/schema/sales/preferences.js";

const SALES_TYPE_PREFIX = "sales_";

function priorityForType(type) {
  if (type.includes("overdue")) return "high";
  if (type.includes("payment")) return "medium";
  return "low";
}

function hrefForAlert(type, entityType, entityId) {
  if (entityType === "lead" && entityId) return `/sales/leads/${entityId}`;
  if (entityType === "follow_up" && entityId) return `/sales/follow-ups`;
  if (entityType === "invoice" && entityId) return `/sales/invoices/${entityId}`;
  if (entityType === "payment" && entityId) return `/sales/receipts/${entityId}`;
  if (entityType === "proposal" && entityId) return `/sales/proposals/${entityId}`;
  if (type.includes("installment")) return "/sales/installments";
  return "/sales/notifications";
}

async function upsertSalesAlert(userId, { type, title, body, entityType, entityId }) {
  const existing = await notificationsTable
    .findOne({ userId, type, entityType, entityId })
    .lean();
  if (existing) {
    await notificationsTable.updateOne(
      { id: existing.id },
      { $set: { title, body, createdAt: new Date() } },
    );
    return existing.id;
  }
  const id = await getNextSequence("notifications");
  await notificationsTable.create({
    id,
    userId,
    type,
    title,
    body,
    entityType,
    entityId,
    isRead: false,
    createdAt: new Date(),
  });
  return id;
}

async function syncSalesAlerts(userId, role) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const isAdmin = role === "super_admin" || role === "hr";
  const prefs = await SalesPreferences.findOne({ id: 1 }).lean();
  const overdueAlerts = prefs?.overdueAlerts ?? true;
  const pushNotifications = prefs?.pushNotifications ?? true;
  if (!pushNotifications) return;

  const followUpQuery = {
    status: { $in: ["scheduled", "overdue"] },
    scheduledAt: { $lt: now },
  };
  if (!isAdmin) followUpQuery.executiveId = userId;

  const invoiceFilter = { status: { $in: ["unpaid", "partial", "overdue"] }, dueDate: { $lt: now } };
  const paymentFilter = { createdAt: { $gte: weekAgo } };
  const proposalFilter = { status: "approved", updatedAt: { $gte: weekAgo } };
  if (!isAdmin) {
    paymentFilter.recordedBy = userId;
    proposalFilter.assignedTo = userId;
  }

  const [overdueFollowUps, overdueInvoices, recentPayments, assignedLeads, approvedProposals] =
    await Promise.all([
      SalesFollowUps.find(followUpQuery).sort({ scheduledAt: 1 }).limit(30).lean(),
      isAdmin
        ? SalesInvoices.find(invoiceFilter).sort({ dueDate: 1 }).limit(30).lean()
        : Promise.resolve([]),
      SalesPayments.find(paymentFilter).sort({ createdAt: -1 }).limit(20).lean(),
      SalesLeads.find({
        assignedTo: userId,
        status: { $nin: ["converted", "lost"] },
        updatedAt: { $gte: weekAgo },
      })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      SalesProposals.find(proposalFilter)
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
    ]);

  if (overdueAlerts) {
    for (const fu of overdueFollowUps) {
      await upsertSalesAlert(userId, {
        type: `${SALES_TYPE_PREFIX}follow_up_reminder`,
        title: "Overdue follow-up",
        body: `Follow-up for lead #${fu.leadId} was due ${fu.scheduledAt.toISOString().slice(0, 10)}.`,
        entityType: "follow_up",
        entityId: fu.id,
      });
    }

    for (const inv of overdueInvoices) {
      await upsertSalesAlert(userId, {
        type: `${SALES_TYPE_PREFIX}overdue_payment`,
        title: "Overdue invoice",
        body: `Invoice ${inv.number} is overdue (₹${Math.max(0, inv.amount - inv.paidAmount).toLocaleString("en-IN")} outstanding).`,
        entityType: "invoice",
        entityId: inv.id,
      });
    }
  }

  for (const pay of recentPayments) {
    await upsertSalesAlert(userId, {
      type: `${SALES_TYPE_PREFIX}payment_received`,
      title: "Payment received",
      body: `₹${pay.amount.toLocaleString("en-IN")} recorded${pay.invoiceId ? ` for invoice #${pay.invoiceId}` : ""}.`,
      entityType: "payment",
      entityId: pay.id,
    });
  }

  for (const lead of assignedLeads) {
    await upsertSalesAlert(userId, {
      type: `${SALES_TYPE_PREFIX}lead_assigned`,
      title: "Lead assigned to you",
      body: `${lead.name}${lead.company ? ` (${lead.company})` : ""} — status: ${lead.status.replace(/_/g, " ")}.`,
      entityType: "lead",
      entityId: lead.id,
    });
  }

  for (const prop of approvedProposals) {
    await upsertSalesAlert(userId, {
      type: `${SALES_TYPE_PREFIX}proposal_approved`,
      title: "Proposal approved",
      body: `${prop.number ?? `Proposal #${prop.id}`} was approved.`,
      entityType: "proposal",
      entityId: prop.id,
    });
  }
}

async function getSalesNotifications(req, res) {
  await syncSalesAlerts(req.user.id, req.user.role);
  const { page, limit, skip } = parsePagination(req.query);
  const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === true;
  const userId = req.user.id;
  const baseQuery = { userId, type: { $regex: /^sales_/ } };
  const query = unreadOnly ? { ...baseQuery, ...unreadNotificationFilter(userId) } : baseQuery;

  const [rows, total, unreadCount] = await Promise.all([
    notificationsTable
      .find(query, NOTIFICATION_LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    notificationsTable.countDocuments(query),
    notificationsTable.countDocuments({ ...baseQuery, ...unreadNotificationFilter(userId) }),
  ]);

  res.json({
    notifications: rows.map((n) => ({
      ...formatNotificationRow(n),
      priority: priorityForType(n.type),
      href: hrefForAlert(n.type, n.entityType, n.entityId),
    })),
    unreadCount,
    total,
    page,
    limit,
  });
}

async function markSalesNotificationRead(req, res) {
  const id = parseIdParam(req.params.id, "notification id");
  const result = await notificationsTable.updateOne(
    { id, userId: req.user.id, type: { $regex: /^sales_/ } },
    { $set: { readAt: new Date(), isRead: true } },
  );
  if (result.matchedCount === 0) notFound("Notification");
  res.json({ success: true });
}

async function markAllSalesNotificationsRead(req, res) {
  await notificationsTable.updateMany(
    { userId: req.user.id, type: { $regex: /^sales_/ }, ...unreadNotificationFilter(req.user.id) },
    { $set: { readAt: new Date(), isRead: true } },
  );
  res.json({ success: true });
}

export { getSalesNotifications, markSalesNotificationRead, markAllSalesNotificationsRead };
