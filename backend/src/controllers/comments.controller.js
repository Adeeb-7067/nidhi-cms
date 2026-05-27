import { commentsTable, usersTable, projectMembersTable, notificationsTable, ticketsTable, getNextSequence } from "../models/schema/index.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import { broadcast, notifyUser } from "../lib/realtime.js";
import { parsePagination, badRequest, notFound, forbidden, parseIdParam } from "../utils/route-errors.js";
import { toIso } from "../utils/mongo-list.js";
import {
  assertTicketAccess,
  getTicketParticipantIds,
  nextStatusAfterReply,
} from "../services/ticket-support.js";
import { syncClientDiscussionImageToResource } from "../services/comment-chat-resource.js";

function mapCommentRow(c, authorMap, repliesByParent) {
  const author = authorMap.get(c.authorId);
  return {
    id: c.id,
    authorId: c.authorId,
    authorName: author?.name ?? "Unknown",
    authorAvatarUrl: author?.avatarUrl ?? null,
    authorRole: author?.role ?? "developer",
    threadType: c.threadType,
    threadId: c.threadId,
    content: c.content,
    attachmentUrl: c.attachmentUrl ?? null,
    attachmentName: c.attachmentName ?? null,
    attachmentMimeType: c.attachmentMimeType ?? null,
    parentId: c.parentId,
    isEdited: c.isEdited,
    replies: (repliesByParent.get(c.id) ?? []).map((r) => mapCommentRow(r, authorMap, repliesByParent)),
    createdAt: toIso(c.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(c.updatedAt) ?? new Date().toISOString(),
  };
}

async function formatComment(c) {
  const all = await commentsTable.find({ threadType: c.threadType, threadId: c.threadId }).lean().exec();
  const threadRows = c.parentId == null ? all : [...all, c];
  const authorIds = [...new Set(threadRows.map((row) => row.authorId))];
  const authors = await usersTable
    .find({ id: { $in: authorIds } }, { id: 1, name: 1, avatarUrl: 1, role: 1 })
    .lean()
    .exec();
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const repliesByParent = new Map();
  for (const row of all) {
    if (row.parentId == null) continue;
    if (!repliesByParent.has(row.parentId)) repliesByParent.set(row.parentId, []);
    repliesByParent.get(row.parentId).push(row);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  return mapCommentRow(c, authorMap, repliesByParent);
}

async function formatCommentsPage(threadType, threadIdNum, topLevel) {
  if (!topLevel.length) return [];
  const all = await commentsTable.find({ threadType, threadId: threadIdNum }).lean().exec();
  const authorIds = [...new Set(all.map((row) => row.authorId))];
  const authors = await usersTable
    .find({ id: { $in: authorIds } }, { id: 1, name: 1, avatarUrl: 1, role: 1 })
    .lean()
    .exec();
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const repliesByParent = new Map();
  for (const row of all) {
    if (row.parentId == null) continue;
    if (!repliesByParent.has(row.parentId)) repliesByParent.set(row.parentId, []);
    repliesByParent.get(row.parentId).push(row);
  }
  for (const list of repliesByParent.values()) {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }
  return topLevel.map((c) => mapCommentRow(c, authorMap, repliesByParent));
}
async function getComments(req, res) {
  const q = req.query;
  const { threadType, threadId } = q;
  if (!threadType || !threadId) {
    badRequest("Discussion thread type and id are required.", "threadType");
  }
  const threadIdNum = parseIdParam(threadId, "threadId");
  if (threadType === "ticket") {
    await assertTicketAccess(req.user, threadIdNum);
  }
  const { page, limit, skip } = parsePagination(q);
  const recent = q.recent === "true" || q.recent === true;
  const topLevelQuery = {
    threadType,
    threadId: threadIdNum,
    $or: [
      { parentId: null },
      { parentId: { $exists: false } }
    ]
  };
  const total = await commentsTable.countDocuments(topLevelQuery);
  const effectiveSkip = recent ? Math.max(0, total - limit) : skip;
  const topLevel = await commentsTable
    .find(topLevelQuery)
    .sort({ createdAt: 1 })
    .skip(effectiveSkip)
    .limit(limit);
  const formatted = await formatCommentsPage(threadType, threadIdNum, topLevel);
  res.json({ comments: formatted, total });
}
async function postComments(req, res) {
  const { threadType, threadId, content, parentId, attachmentUrl, attachmentName, attachmentMimeType } = req.body;
  const text = typeof content === "string" ? content.trim() : "";
  if (!threadType || threadId == null) {
    badRequest("threadType and threadId are required.", !threadType ? "threadType" : "threadId");
  }
  if (!text && !attachmentUrl) {
    badRequest("Message text or an attachment is required.", "content");
  }
  if (attachmentUrl) {
    validateStoredFileUrl(attachmentUrl, "attachmentUrl");
  }
  const threadIdNum = parseIdParam(threadId, "threadId");
  let ticketForThread = null;
  if (threadType === "ticket") {
    ticketForThread = await assertTicketAccess(req.user, threadIdNum);
  }
  const nextId = await getNextSequence("comments");
  const comment = await commentsTable.create({
    id: nextId,
    authorId: req.user.id,
    threadType,
    threadId: threadIdNum,
    content: text || "",
    attachmentUrl: attachmentUrl ?? null,
    attachmentName: attachmentName ?? null,
    attachmentMimeType: attachmentMimeType ?? null,
    parentId: parentId ?? null
  });
  if (threadType === "project" && attachmentUrl) {
    try {
      await syncClientDiscussionImageToResource(req, {
        projectId: threadIdNum,
        commentId: comment.id,
        attachmentUrl,
        attachmentName,
        attachmentMimeType,
        content: text,
      });
    } catch (err) {
      console.error("Failed to sync discussion image to resources:", err);
    }
  }
  if (ticketForThread) {
    const statusUpdate = nextStatusAfterReply(ticketForThread, req.user.role);
    if (statusUpdate) {
      await ticketsTable.updateOne({ id: ticketForThread.id }, { $set: { status: statusUpdate } });
      broadcast("ticket_update", { id: ticketForThread.id, status: statusUpdate });
    }
  }
  const formattedComment = await formatComment(comment);
  broadcast("comment", {
    threadType: comment.threadType,
    threadId: comment.threadId,
    comment: formattedComment
  });
  try {
    const recipientIds = /* @__PURE__ */ new Set();
    if (threadType === "project") {
      const members = await projectMembersTable.find({ projectId: threadIdNum });
      members.forEach((m) => recipientIds.add(m.userId));
    } else if (threadType === "ticket" && ticketForThread) {
      const ids = await getTicketParticipantIds(ticketForThread, req.user.id);
      ids.forEach((id) => recipientIds.add(id));
    }
    const threadComments = await commentsTable
      .find({ threadType, threadId: threadIdNum })
      .select("authorId")
      .lean();
    threadComments.forEach((c) => recipientIds.add(c.authorId));
    recipientIds.delete(req.user.id);
    const authorName = req.user.name;
    const isPdf =
      attachmentMimeType === "application/pdf" ||
      (typeof attachmentName === "string" && attachmentName.toLowerCase().endsWith(".pdf"));
    const notifBody = text
      ? (text.length > 80 ? text.slice(0, 77) + "..." : text)
      : isPdf
        ? "Sent a PDF"
        : attachmentUrl
          ? "Sent an attachment"
          : "New message";
    await Promise.all(Array.from(recipientIds).map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      const notifProjectId =
        threadType === "project"
          ? threadIdNum
          : ticketForThread?.projectId ?? null;
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "comment",
        title: `${authorName} commented`,
        body: notifBody,
        entityType: threadType === "ticket" ? "ticket" : threadType,
        entityId: threadIdNum,
        projectId: notifProjectId,
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(userId, "notification", {
        type: "comment",
        title: `${authorName} commented`,
        body: notifBody,
        entityType: threadType === "ticket" ? "ticket" : threadType,
        entityId: threadIdNum,
        projectId: notifProjectId
      });
    }));
  } catch (err) {
    console.error("Failed to create comment notifications:", err);
  }
  res.status(201).json(formattedComment);
}
async function patchCommentsById(req, res) {
  const { content } = req.body;
  const id = parseInt(req.params["id"]);
  const comment = await commentsTable.findOneAndUpdate(
    { id, authorId: req.user.id },
    { $set: { content, isEdited: true } },
    { new: true }
  );
  if (!comment) notFound("Comment");
  res.json(await formatComment(comment));
}
export {
  getComments,
  patchCommentsById,
  postComments
};
