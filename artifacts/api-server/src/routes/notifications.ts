import { Router } from "express";
import { db } from "../lib/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/notifications
router.get("/notifications", requireAuth, async (req, res) => {
  const { unreadOnly, page = "1", limit = "20" } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [eq(notificationsTable.userId, req.user!.id)];
  if (unreadOnly === "true") conditions.push(isNull(notificationsTable.readAt));

  const [notifications, countResult, unreadCount] = await Promise.all([
    db.select().from(notificationsTable).where(and(...conditions)).orderBy(desc(notificationsTable.createdAt)).limit(parseInt(limit)).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(and(...conditions)),
    db.select({ count: sql<number>`count(*)` }).from(notificationsTable).where(and(eq(notificationsTable.userId, req.user!.id), isNull(notificationsTable.readAt))),
  ]);

  res.json({
    notifications: notifications.map((n) => ({ ...n, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() })),
    unreadCount: Number(unreadCount[0].count),
    total: Number(countResult[0].count),
  });
});

// POST /api/notifications/mark-all-read
router.post("/notifications/mark-all-read", requireAuth, async (req, res) => {
  await db.update(notificationsTable).set({ readAt: new Date() }).where(and(eq(notificationsTable.userId, req.user!.id), isNull(notificationsTable.readAt)));
  res.json({ message: "All marked read" });
});

// POST /api/notifications/:id/read
router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  await db.update(notificationsTable).set({ readAt: new Date() }).where(and(eq(notificationsTable.id, parseInt(req.params['id'] as string)), eq(notificationsTable.userId, req.user!.id)));
  res.json({ message: "Marked read" });
});

export default router;
