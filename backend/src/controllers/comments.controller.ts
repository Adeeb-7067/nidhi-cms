import type { Request, Response } from "express";
﻿import { commentsTable, usersTable, projectMembersTable, notificationsTable, getNextSequence } from "@/models/schema";
import { broadcast, notifyUser } from "@/lib/realtime";
import { parsePagination, badRequest, parseIdParam } from "@/lib/route-errors";
import { toIso } from "@/lib/mongo-list";

async function formatComment(c: any): Promise<Record<string, unknown>> {
  const author = await usersTable.findOne({ id: c.authorId });
  
  // Recurse to get replies
  const replies = await commentsTable.find({ parentId: c.id }).sort({ createdAt: 1 });
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
    createdAt: toIso(c.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(c.updatedAt) ?? new Date().toISOString(),
  };
}

// GET /api/comments
export async function getComments(req: Request, res: Response) {
  const q = req.query as Record<string, string>;
  const { threadType, threadId } = q;
  if (!threadType || !threadId) {
    badRequest("Discussion thread type and id are required.", "threadType");
  }
  const threadIdNum = parseIdParam(threadId, "threadId");
  const { page, limit, skip } = parsePagination(q);

  const topLevelQuery: Record<string, any> = {
    threadType,
    threadId: threadIdNum,
    $or: [
      { parentId: null },
      { parentId: { $exists: false } }
    ]
  };

  const [topLevel, total] = await Promise.all([
    commentsTable.find(topLevelQuery).sort({ createdAt: 1 }).skip(skip).limit(limit),
    commentsTable.countDocuments(topLevelQuery)
  ]);

  const formatted = await Promise.all(topLevel.map(formatComment));
  res.json({ comments: formatted, total });
}


// POST /api/comments
export async function postComments(req: Request, res: Response) {
  const { threadType, threadId, content, parentId } = req.body as { threadType: string; threadId: number; content: string; parentId?: number };
  if (!threadType || !threadId || !content) {
    res.status(400).json({ error: "threadType, threadId, content required" });
    return;
  }
  
  const nextId = await getNextSequence("comments");
  const comment = await commentsTable.create({
    id: nextId,
    authorId: req.user!.id,
    threadType,
    threadId,
    content,
    parentId: parentId ?? null
  });
  
  const formattedComment = await formatComment(comment);
  
  // Realtime broadcast so all clients listening get the new comment
  broadcast("comment", {
    threadType: comment.threadType,
    threadId: comment.threadId,
    comment: formattedComment
  });

  // ΓöÇΓöÇ Create targeted notifications for thread participants ΓöÇΓöÇ
  try {
    // Find all users who should be notified (project members, or thread participants)
    const recipientIds = new Set<number>();

    if (threadType === "project") {
      // Notify all project members
      const members = await projectMembersTable.find({ projectId: threadId });
      members.forEach((m: any) => recipientIds.add(m.userId));
    }

    // Also notify unique commenters on this thread (for discussions, tickets, etc.)
    const threadComments = await commentsTable.find({ threadType, threadId }).select("authorId").lean();
    threadComments.forEach((c: any) => recipientIds.add(c.authorId));

    // Remove the comment author ΓÇö don't notify yourself
    recipientIds.delete(req.user!.id);

    const authorName = req.user!.name;
    const truncatedContent = content.length > 80 ? content.slice(0, 77) + "..." : content;

    // Create notification records and emit socket events for each recipient
    await Promise.all(Array.from(recipientIds).map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "comment",
        title: `${authorName} commented`,
        body: truncatedContent,
        entityType: threadType,
        entityId: threadId,
        isRead: false,
        createdAt: new Date()
      });

      // Push live socket event to this specific user
      notifyUser(userId, "notification", {
        type: "comment",
        title: `${authorName} commented`,
        body: truncatedContent,
        entityType: threadType,
        entityId: threadId
      });
    }));
  } catch (err) {
    console.error("Failed to create comment notifications:", err);
  }
  
  res.status(201).json(formattedComment);
}


// PATCH /api/comments/:id
export async function patchCommentsById(req: Request, res: Response) {
  const { content } = req.body as { content: string };
  const id = parseInt(req.params['id'] as string);

  const comment = await commentsTable.findOneAndUpdate(
    { id, authorId: req.user!.id },
    { $set: { content, isEdited: true } },
    { new: true }
  );
  
  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  res.json(await formatComment(comment));
}

