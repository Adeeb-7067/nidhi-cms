import { commentsTable, usersTable, projectMembersTable, notificationsTable, getNextSequence } from "../models/schema/index.js";
import { broadcast, notifyUser } from "../lib/realtime.js";
import { parsePagination, badRequest, notFound, parseIdParam } from "../utils/route-errors.js";
import { toIso } from "../utils/mongo-list.js";

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
  const { page, limit, skip } = parsePagination(q);
  const topLevelQuery = {
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
  const formatted = await formatCommentsPage(threadType, threadIdNum, topLevel);
  res.json({ comments: formatted, total });
}
async function postComments(req, res) {
  const { threadType, threadId, content, parentId } = req.body;
  if (!threadType || !threadId || !content) {
    badRequest("threadType, threadId, and content are required.", !threadType ? "threadType" : !threadId ? "threadId" : "content");
  }
  const nextId = await getNextSequence("comments");
  const comment = await commentsTable.create({
    id: nextId,
    authorId: req.user.id,
    threadType,
    threadId,
    content,
    parentId: parentId ?? null
  });
  const formattedComment = await formatComment(comment);
  broadcast("comment", {
    threadType: comment.threadType,
    threadId: comment.threadId,
    comment: formattedComment
  });
  try {
    const recipientIds = /* @__PURE__ */ new Set();
    if (threadType === "project") {
      const members = await projectMembersTable.find({ projectId: threadId });
      members.forEach((m) => recipientIds.add(m.userId));
    }
    const threadComments = await commentsTable.find({ threadType, threadId }).select("authorId").lean();
    threadComments.forEach((c) => recipientIds.add(c.authorId));
    recipientIds.delete(req.user.id);
    const authorName = req.user.name;
    const truncatedContent = content.length > 80 ? content.slice(0, 77) + "..." : content;
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
        createdAt: /* @__PURE__ */ new Date()
      });
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
