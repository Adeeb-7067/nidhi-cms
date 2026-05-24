import { notificationsTable, getNextSequence, usersTable } from "../models/schema/index.js";
import { broadcast } from "../lib/realtime.js";
import { parsePagination, badRequest } from "../utils/route-errors.js";
import {
  formatNotificationRow,
  NOTIFICATION_LIST_PROJECTION,
  unreadNotificationFilter
} from "../mappers/notification-format.js";
async function getNotifications(req, res) {
  const q = req.query;
  const { page, limit, skip } = parsePagination(q);
  const unreadOnly = q.unreadOnly === "true";
  const userId = req.user.id;
  const unreadFilter = unreadNotificationFilter(userId);
  const query = unreadOnly ? unreadFilter : { userId };
  if (unreadOnly && limit === 1 && page === 1) {
    const unreadCount2 = await notificationsTable.countDocuments(unreadFilter);
    res.json({ notifications: [], unreadCount: unreadCount2, total: unreadCount2 });
    return;
  }
  const [notifications, total, unreadCount] = await Promise.all([
    notificationsTable.find(query, NOTIFICATION_LIST_PROJECTION).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    notificationsTable.countDocuments(query),
    notificationsTable.countDocuments(unreadFilter)
  ]);
  res.json({
    notifications: notifications.map((n) => formatNotificationRow(n)),
    unreadCount,
    total,
    page,
    limit,
  });
}
async function postNotificationsMarkAllRead(req, res) {
  await notificationsTable.updateMany(unreadNotificationFilter(req.user.id), {
    $set: { readAt: /* @__PURE__ */ new Date(), isRead: true }
  });
  res.json({ message: "All marked read" });
}
async function postNotificationsByIdRead(req, res) {
  const id = parseInt(req.params["id"]);
  await notificationsTable.updateOne(
    { id, userId: req.user.id },
    { $set: { readAt: /* @__PURE__ */ new Date(), isRead: true } }
  );
  res.json({ message: "Marked read" });
}
async function postNotificationsBroadcast(req, res) {
  const { title, body, type = "broadcast" } = req.body;
  if (!title || !body) {
    badRequest("title and body are required.", !title ? "title" : "body");
  }
  const users = await usersTable.find({ status: "active" });
  const notifications = await Promise.all(users.map(async (u) => {
    const id = await getNextSequence("notifications");
    return {
      id,
      userId: u.id,
      type,
      title,
      body,
      isRead: false,
      createdAt: /* @__PURE__ */ new Date()
    };
  }));
  await notificationsTable.insertMany(notifications);
  broadcast("notification", {
    type,
    title,
    body,
    broadcast: true
  });
  res.status(201).json({ message: `Broadcast sent to ${users.length} users` });
}
export {
  getNotifications,
  postNotificationsBroadcast,
  postNotificationsByIdRead,
  postNotificationsMarkAllRead
};
