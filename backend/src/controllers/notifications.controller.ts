import type { Request, Response } from "express";
import { notificationsTable, getNextSequence, usersTable } from "@/models/schema";
import { broadcast } from "@/lib/realtime";
import { parsePagination } from "@/lib/route-errors";
import {
  formatNotificationRow,
  NOTIFICATION_LIST_PROJECTION,
  unreadNotificationFilter,
} from "@/services/notification-format";

// GET /api/notifications
export async function getNotifications(req: Request, res: Response) {
  const q = req.query as Record<string, string>;
  const { page, limit, skip } = parsePagination(q);
  const unreadOnly = q.unreadOnly === "true";
  const userId = req.user!.id;
  const unreadFilter = unreadNotificationFilter(userId);
  const query = unreadOnly ? unreadFilter : { userId };

  // Badge polling: unreadOnly + limit 1 ΓåÆ count only (no document fetch)
  if (unreadOnly && limit === 1 && page === 1) {
    const unreadCount = await notificationsTable.countDocuments(unreadFilter);
    res.json({ notifications: [], unreadCount, total: unreadCount });
    return;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    notificationsTable
      .find(query, NOTIFICATION_LIST_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    notificationsTable.countDocuments(query),
    notificationsTable.countDocuments(unreadFilter),
  ]);

  res.json({
    notifications: notifications.map((n) => formatNotificationRow(n as never)),
    unreadCount,
    total,
  });
}


// POST /api/notifications/mark-all-read
export async function postNotificationsMarkAllRead(req: Request, res: Response) {
  await notificationsTable.updateMany(unreadNotificationFilter(req.user!.id), {
    $set: { readAt: new Date(), isRead: true },
  });
  res.json({ message: "All marked read" });
}


// POST /api/notifications/:id/read
export async function postNotificationsByIdRead(req: Request, res: Response) {
  const id = parseInt(req.params['id'] as string);
  await notificationsTable.updateOne(
    { id, userId: req.user!.id },
    { $set: { readAt: new Date(), isRead: true } }
  );
  res.json({ message: "Marked read" });
}


// POST /api/notifications/broadcast
export async function postNotificationsBroadcast(req: Request, res: Response) {
  const { title, body, type = "broadcast" } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "title and body required" });
    return;
  }

  const users = await usersTable.find({ status: "active" });
  
  const notifications = await Promise.all(users.map(async (u: any) => {
    const id = await getNextSequence("notifications");
    return {
      id,
      userId: u.id,
      type,
      title,
      body,
      isRead: false,
      createdAt: new Date()
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

