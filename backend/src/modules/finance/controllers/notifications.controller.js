import {
  FinanceInvoices,
  FinanceExpenses,
  FinanceCheques,
  notificationsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { parsePagination, notFound, parseIdParam } from "../../../utils/route-errors.js";
import {
  formatNotificationRow,
  NOTIFICATION_LIST_PROJECTION,
  unreadNotificationFilter,
} from "../../../mappers/notification-format.js";
import { calcInvoiceTotal } from "../../../utils/finance-totals.js";

const FINANCE_TYPE_PREFIX = "finance_";
const CHEQUE_CLEARANCE_WINDOW_DAYS = 7;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function priorityForType(type) {
  if (type.includes("overdue") || type.includes("exceeded") || type.includes("cheque_clearance")) return "high";
  if (type.includes("budget") || type.includes("pending_approval")) return "medium";
  return "low";
}

function hrefForAlert(type, entityType, entityId) {
  if (entityType === "invoice" && entityId) return `/finance/invoices/${entityId}`;
  if (entityType === "expense") return "/finance/expenses";
  if (entityType === "budget") return "/finance/budgets";
  if (entityType === "cheque" && entityId) return `/finance/cheques/${entityId}`;
  return "/finance";
}

async function upsertFinanceAlert(userId, { type, title, body, entityType, entityId }) {
  const existing = await notificationsTable.findOne({ userId, type, entityType, entityId }).lean();
  if (existing) {
    await notificationsTable.updateOne({ id: existing.id }, { $set: { title, body, createdAt: new Date() } });
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

async function syncFinanceAlerts(userId) {
  const now = new Date();
  const clearanceWindowEnd = new Date(startOfDay(now));
  clearanceWindowEnd.setDate(clearanceWindowEnd.getDate() + CHEQUE_CLEARANCE_WINDOW_DAYS);
  clearanceWindowEnd.setHours(23, 59, 59, 999);

  const [overdueInvoices, pendingExpenses, clearingCheques] = await Promise.all([
    FinanceInvoices.find({ status: { $in: ["unpaid", "partially_paid"] }, dueDate: { $lt: now } })
      .sort({ dueDate: 1 })
      .limit(30)
      .lean(),
    FinanceExpenses.find({ status: "pending" }).sort({ date: -1 }).limit(30).lean(),
    FinanceCheques.find({
      status: "issued",
      clearanceDate: { $gte: startOfDay(now), $lte: clearanceWindowEnd },
    })
      .sort({ clearanceDate: 1 })
      .limit(30)
      .lean(),
  ]);

  for (const inv of overdueInvoices) {
    const { total } = calcInvoiceTotal(inv.items, inv.discount, inv.gstEnabled);
    await upsertFinanceAlert(userId, {
      type: `${FINANCE_TYPE_PREFIX}overdue_invoice`,
      title: "Overdue invoice",
      body: `Invoice ${inv.number} is overdue (₹${Math.max(0, total - inv.paidAmount).toLocaleString("en-IN")} outstanding).`,
      entityType: "invoice",
      entityId: inv.id,
    });
  }

  for (const exp of pendingExpenses) {
    await upsertFinanceAlert(userId, {
      type: `${FINANCE_TYPE_PREFIX}expense_pending_approval`,
      title: "Expense pending approval",
      body: `${exp.reference} — ₹${exp.amount.toLocaleString("en-IN")} awaiting approval.`,
      entityType: "expense",
      entityId: exp.id,
    });
  }

  for (const chq of clearingCheques) {
    const clearLabel = new Date(chq.clearanceDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    await upsertFinanceAlert(userId, {
      type: `${FINANCE_TYPE_PREFIX}cheque_clearance`,
      title: `Cheque ${chq.chequeNumber} clearing soon`,
      body: `Cheque ${chq.chequeNumber} to ${chq.payeeName} clears on ${clearLabel}.`,
      entityType: "cheque",
      entityId: chq.id,
    });
  }

  // Budget-exceeded alerts are deliberately not synced here — computing spend
  // per budget requires the aggregation-heavy computeSpentForBudget, which
  // would fan out into an N+1 aggregation on every notification-bell open.
  // The Budgets page itself surfaces overspend live; revisit if this needs
  // to become a push alert too.
}

async function getFinanceNotifications(req, res) {
  await syncFinanceAlerts(req.user.id);
  const { page, limit, skip } = parsePagination(req.query);
  const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === true;
  const userId = req.user.id;
  const baseQuery = { userId, type: { $regex: /^finance_/ } };
  const query = unreadOnly ? { ...baseQuery, ...unreadNotificationFilter(userId) } : baseQuery;

  const [rows, total, unreadCount] = await Promise.all([
    notificationsTable.find(query, NOTIFICATION_LIST_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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

async function markFinanceNotificationRead(req, res) {
  const id = parseIdParam(req.params.id, "notification id");
  const result = await notificationsTable.updateOne(
    { id, userId: req.user.id, type: { $regex: /^finance_/ } },
    { $set: { readAt: new Date(), isRead: true } },
  );
  if (result.matchedCount === 0) notFound("Notification");
  res.json({ success: true });
}

async function markAllFinanceNotificationsRead(req, res) {
  await notificationsTable.updateMany(
    { userId: req.user.id, type: { $regex: /^finance_/ }, ...unreadNotificationFilter(req.user.id) },
    { $set: { readAt: new Date(), isRead: true } },
  );
  res.json({ success: true });
}

export { getFinanceNotifications, markFinanceNotificationRead, markAllFinanceNotificationsRead };
