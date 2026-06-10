import { commentsTable, usersTable, notificationsTable, ticketsTable, getNextSequence } from "../models/schema/index.js";
import { validateStoredFileUrl } from "../lib/file-storage.js";
import { broadcast, emitToUsers, notifyUser } from "../lib/realtime.js";
import { parsePagination, badRequest, notFound, forbidden, parseIdParam } from "../utils/route-errors.js";
import { toIso } from "../utils/mongo-list.js";
import {
  assertTicketAccess,
  getTicketParticipantIds,
  nextStatusAfterReply,
} from "../services/ticket-support.js";
import { syncClientDiscussionImageToResource } from "../services/comment-chat-resource.js";
import {
  resolveCompanyTeamMentionCandidates,
  resolveCompanyTeamMentionIds,
  resolveProjectMentionIds,
} from "../services/comment-mentions.js";
import { getProjectDiscussionPreviews } from "../services/discussion-previews.js";
import {
  canAccessDiscussionThread,
  canAccessCompanyTeamDiscussion,
  COMPANY_TEAM_THREAD,
  COMPANY_TEAM_THREAD_ID,
  getDiscussionParticipantIds,
} from "../services/discussion-project-access.js";

function isProjectDiscussionThread(threadType) {
  return threadType === "project" || threadType === "project_internal" || threadType === COMPANY_TEAM_THREAD;
}

// company_team uses a fixed sentinel id (0), which `parseIdParam` rejects.
// Validate manually for that thread type so the team chat is reachable.
function parseDiscussionThreadId(rawThreadId, threadType) {
  if (threadType === COMPANY_TEAM_THREAD) {
    const value = Array.isArray(rawThreadId) ? rawThreadId[0] : rawThreadId;
    const id = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(id) || id !== COMPANY_TEAM_THREAD_ID) {
      badRequest(`Invalid threadId for company_team. Expected ${COMPANY_TEAM_THREAD_ID}.`, "threadId");
    }
    return id;
  }
  return parseIdParam(rawThreadId, "threadId");
}

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
    mentionedUserIds: c.mentionedUserIds ?? [],
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
async function getProjectCommentPreviews(req, res) {
  const result = await getProjectDiscussionPreviews(req.user);
  res.json(result);
}
async function getCompanyTeamMentionCandidates(req, res) {
  if (!canAccessCompanyTeamDiscussion(req.user.role)) forbidden();
  const candidates = await resolveCompanyTeamMentionCandidates();
  res.json({ candidates });
}
async function getComments(req, res) {
  const q = req.query;
  const { threadType, threadId } = q;
  if (!threadType || threadId == null || threadId === "") {
    badRequest("Discussion thread type and id are required.", "threadType");
  }
  const threadIdNum = parseDiscussionThreadId(threadId, threadType);
  if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
  }
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
  const {
    threadType,
    threadId,
    content,
    parentId,
    attachmentUrl,
    attachmentName,
    attachmentMimeType,
    mentionedUserIds: requestedMentionIds,
  } = req.body;
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
  const threadIdNum = parseDiscussionThreadId(threadId, threadType);
  if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
  }
  let ticketForThread = null;
  if (threadType === "ticket") {
    ticketForThread = await assertTicketAccess(req.user, threadIdNum);
  }
  let mentionIds = [];
  if (threadType === COMPANY_TEAM_THREAD) {
    mentionIds = await resolveCompanyTeamMentionIds(req.user.id, requestedMentionIds, text);
  } else if (isProjectDiscussionThread(threadType)) {
    mentionIds = await resolveProjectMentionIds(
      threadIdNum,
      req.user.id,
      requestedMentionIds,
      text,
      threadType,
    );
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
    parentId: parentId ?? null,
    mentionedUserIds: mentionIds,
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
  try {
    const recipientIds = /* @__PURE__ */ new Set();
    let participantIds = null;
    if (isProjectDiscussionThread(threadType)) {
      participantIds = await getDiscussionParticipantIds(threadIdNum, threadType);
      participantIds.forEach((id) => recipientIds.add(id));
    } else if (threadType === "ticket" && ticketForThread) {
      const ids = await getTicketParticipantIds(ticketForThread, null);
      participantIds = new Set(ids);
      ids.forEach((id) => recipientIds.add(id));
    }
    const threadComments = await commentsTable
      .find({ threadType, threadId: threadIdNum })
      .select("authorId")
      .lean();
    for (const c of threadComments) {
      if (participantIds?.has(c.authorId)) recipientIds.add(c.authorId);
    }
    for (const id of mentionIds) {
      if (!participantIds || participantIds.has(id)) recipientIds.add(id);
    }
    recipientIds.delete(req.user.id);

    emitToUsers(Array.from(recipientIds), "comment", {
      threadType: comment.threadType,
      threadId: comment.threadId,
      comment: formattedComment,
    });
    const authorName = req.user.name;
    const isPdf =
      attachmentMimeType === "application/pdf" ||
      (typeof attachmentName === "string" && attachmentName.toLowerCase().endsWith(".pdf"));
    const isAudio =
      (typeof attachmentMimeType === "string" && attachmentMimeType.startsWith("audio/")) ||
      (typeof attachmentName === "string" && /\.(webm|ogg|mp3|m4a|wav)$/i.test(attachmentName));
    const notifBody = text
      ? (text.length > 80 ? text.slice(0, 77) + "..." : text)
      : isAudio
        ? "Sent a voice message"
        : isPdf
        ? "Sent a PDF"
        : attachmentUrl
          ? "Sent an attachment"
          : "New message";
    const mentionSet = new Set(mentionIds);
    await Promise.all(Array.from(recipientIds).map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      const notifProjectId =
        threadType === COMPANY_TEAM_THREAD
          ? null
          : isProjectDiscussionThread(threadType)
            ? threadIdNum
            : ticketForThread?.projectId ?? null;
      const isMention = mentionSet.has(userId);
      const notifType = isMention ? "comment_mention" : "comment";
      const notifTitle = isMention
        ? `${authorName} mentioned you`
        : `${authorName} commented`;
      await notificationsTable.create({
        id: notifId,
        userId,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        entityType: threadType === "ticket" ? "ticket" : threadType,
        entityId: threadIdNum,
        projectId: notifProjectId,
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(userId, "notification", {
        type: notifType,
        title: notifTitle,
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
  getCompanyTeamMentionCandidates,
  getProjectCommentPreviews,
  patchCommentsById,
  postComments
};
