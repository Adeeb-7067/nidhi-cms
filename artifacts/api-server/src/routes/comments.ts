import { Router } from "express";
import { db } from "../lib/db";
import { commentsTable, usersTable } from "@workspace/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function formatComment(c: typeof commentsTable.$inferSelect): Promise<Record<string, unknown>> {
  const [author] = await db.select({ name: usersTable.name, avatarUrl: usersTable.avatarUrl, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, c.authorId));
  const replies = await db.select().from(commentsTable).where(eq(commentsTable.parentId, c.id)).orderBy(commentsTable.createdAt);
  const formattedReplies = await Promise.all(replies.map(formatComment));
  return {
    id: c.id,
    authorId: c.authorId,
    authorName: author?.name ?? "Unknown",
    authorAvatarUrl: author?.avatarUrl ?? null,
    authorRole: author?.role ?? "developer",
    threadType: c.threadType,
    threadId: c.threadId,
    content: c.content,
    parentId: c.parentId,
    isEdited: c.isEdited,
    replies: formattedReplies,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// GET /api/comments
router.get("/comments", requireAuth, async (req, res) => {
  const { threadType, threadId, page = "1", limit = "50" } = req.query as Record<string, string>;
  if (!threadType || !threadId) {
    res.status(400).json({ error: "threadType and threadId required" });
    return;
  }

  const topLevel = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.threadType, threadType as "project" | "log" | "bug" | "apk" | "request"), eq(commentsTable.threadId, parseInt(threadId)), sql`${commentsTable.parentId} IS NULL`))
    .orderBy(commentsTable.createdAt)
    .limit(parseInt(limit))
    .offset((parseInt(page) - 1) * parseInt(limit));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(commentsTable)
    .where(and(eq(commentsTable.threadType, threadType as "project" | "log" | "bug" | "apk" | "request"), eq(commentsTable.threadId, parseInt(threadId)), sql`${commentsTable.parentId} IS NULL`));

  const formatted = await Promise.all(topLevel.map(formatComment));
  res.json({ comments: formatted, total: Number(countResult.count) });
});

// POST /api/comments
router.post("/comments", requireAuth, async (req, res) => {
  const { threadType, threadId, content, parentId } = req.body as { threadType: string; threadId: number; content: string; parentId?: number };
  if (!threadType || !threadId || !content) {
    res.status(400).json({ error: "threadType, threadId, content required" });
    return;
  }
  const [comment] = await db
    .insert(commentsTable)
    .values({ authorId: req.user!.id, threadType: threadType as "project" | "log" | "bug" | "apk" | "request", threadId, content, parentId: parentId ?? null })
    .returning();
  res.status(201).json(await formatComment(comment));
});

// PATCH /api/comments/:id
router.patch("/comments/:id", requireAuth, async (req, res) => {
  const { content } = req.body as { content: string };
  const [comment] = await db
    .update(commentsTable)
    .set({ content, isEdited: true, updatedAt: new Date() })
    .where(and(eq(commentsTable.id, parseInt(req.params['id'] as string)), eq(commentsTable.authorId, req.user!.id)))
    .returning();
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  res.json(await formatComment(comment));
});

export default router;
