import { commentsTable, usersTable, notificationsTable, ticketsTable, getNextSequence, getNextSequenceRange } from "../../../models/schema/index.js";
import { validateStoredFileUrl, deleteStoredFile } from "../../../lib/file-storage.js";
import { broadcast, emitToUsers, notifyUser } from "../../../lib/realtime.js";
import { parsePagination, badRequest, notFound, forbidden, parseIdParam } from "../../../utils/route-errors.js";
import { mapCommentRow } from "../../../mappers/comment-format.js";
import {
  assertTicketAccess,
  getTicketParticipantIds,
  nextStatusAfterReply,
} from "../../work/services/ticket-support.js";
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
  COMPANY_TEAM_UNOFFICIAL_THREAD,
  COMPANY_TEAM_THREAD_ID,
  COMPANY_TEAM_UNOFFICIAL_THREAD_ID,
  isCompanyTeamDiscussionThread,
  getDiscussionParticipantIds,
} from "../services/discussion-project-access.js";
import {
  canAccessDirectConversation,
  getDirectConversationParticipantIds,
  touchDirectConversation,
  DIRECT_THREAD_TYPE,
} from "../services/direct-conversations.js";
import {
  assertClientPermission,
  recordClientTeamActivityFromRequest,
} from "../../identity/services/client-team.js";

function isProjectDiscussionThread(threadType) {
  return (
    threadType === "project" ||
    threadType === "project_internal" ||
    isCompanyTeamDiscussionThread(threadType)
  );
}

function isDirectDiscussionThread(threadType) {
  return threadType === DIRECT_THREAD_TYPE;
}

// Company team channels use a fixed sentinel id (0), which `parseIdParam` rejects.
function parseDiscussionThreadId(rawThreadId, threadType) {
  if (isCompanyTeamDiscussionThread(threadType)) {
    const value = Array.isArray(rawThreadId) ? rawThreadId[0] : rawThreadId;
    const id = Number.parseInt(String(value ?? ""), 10);
    const expectedId =
      threadType === COMPANY_TEAM_UNOFFICIAL_THREAD
        ? COMPANY_TEAM_UNOFFICIAL_THREAD_ID
        : COMPANY_TEAM_THREAD_ID;
    if (!Number.isFinite(id) || id !== expectedId) {
      badRequest(`Invalid threadId for ${threadType}. Expected ${expectedId}.`, "threadId");
    }
    return id;
  }
  return parseIdParam(rawThreadId, "threadId");
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
  if (isDirectDiscussionThread(threadType)) {
    if (!(await canAccessDirectConversation(req.user, threadIdNum))) forbidden();
  } else if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
    // For the client-visible thread, ALSO honor per-section RBAC so a
    // team member with `discussions: none` cannot read messages even
    // though their company can see the project.
    if (threadType === "project") {
      await assertClientPermission(req, "discussions", "view");
    }
  } else if (threadType === "ticket") {
    await assertTicketAccess(req.user, threadIdNum);
  } else {
    // Thread types such as `bug`/`log`/`request`/`apk` are owned by their own
    // modules with their own authorization; they must not be reachable through
    // the generic comments endpoint. Default-deny anything not handled above.
    forbidden();
  }
  const { limit, skip } = parsePagination(q);
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
  let ticketForThread = null;
  if (isDirectDiscussionThread(threadType)) {
    if (!(await canAccessDirectConversation(req.user, threadIdNum))) forbidden();
  } else if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
    // Team members must have at least `create` on discussions to post.
    if (threadType === "project") {
      await assertClientPermission(req, "discussions", "create");
    }
  } else if (threadType === "ticket") {
    ticketForThread = await assertTicketAccess(req.user, threadIdNum);
  } else {
    // Module-owned thread types (bug/log/request/apk) are not postable through
    // the generic endpoint. Default-deny anything not handled above.
    forbidden();
  }
  if (parentId != null) {
    const parent = await commentsTable.findOne({
      id: parentId,
      threadType,
      threadId: threadIdNum,
      $or: [{ parentId: null }, { parentId: { $exists: false } }],
    });
    if (!parent) badRequest("Parent comment not found in this thread.", "parentId");
    if (parent.isDeleted) badRequest("Cannot reply to a deleted message.", "parentId");
  }
  let mentionIds = [];
  if (isCompanyTeamDiscussionThread(threadType)) {
    mentionIds = await resolveCompanyTeamMentionIds(req.user.id, requestedMentionIds, text, threadType);
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
  if (isDirectDiscussionThread(threadType)) {
    await touchDirectConversation(threadIdNum);
  }
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
    if (isDirectDiscussionThread(threadType)) {
      participantIds = await getDirectConversationParticipantIds(threadIdNum);
      participantIds.forEach((id) => recipientIds.add(id));
    } else if (isProjectDiscussionThread(threadType)) {
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
    const recipients = Array.from(recipientIds);
    const notifProjectId =
      isCompanyTeamDiscussionThread(threadType) || isDirectDiscussionThread(threadType)
        ? null
        : isProjectDiscussionThread(threadType)
          ? threadIdNum
          : ticketForThread?.projectId ?? null;
    const notifEntityType = threadType === "ticket" ? "ticket" : threadType;
    // Reserve all notification ids in a single round-trip, then bulk-insert
    // rather than issuing one findOneAndUpdate + insert per recipient.
    const notifIds = recipients.length
      ? await getNextSequenceRange("notifications", recipients.length)
      : [];
    const now = new Date();
    const notifDocs = recipients.map((userId, index) => {
      const isMention = mentionSet.has(userId);
      const notifType = isMention ? "comment_mention" : "comment";
      const notifTitle = isMention
        ? `${authorName} mentioned you`
        : isDirectDiscussionThread(threadType)
          ? `${authorName} sent you a message`
          : `${authorName} commented`;
      return {
        id: notifIds[index],
        userId,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        entityType: notifEntityType,
        entityId: threadIdNum,
        projectId: notifProjectId,
        isRead: false,
        createdAt: now,
      };
    });
    if (notifDocs.length) {
      await notificationsTable.insertMany(notifDocs, { ordered: false });
      for (const doc of notifDocs) {
        notifyUser(doc.userId, "notification", {
          type: doc.type,
          title: doc.title,
          body: doc.body,
          entityType: doc.entityType,
          entityId: doc.entityId,
          projectId: doc.projectId,
        });
      }
    }
  } catch (err) {
    console.error("Failed to create comment notifications:", err);
  }

  // Track posts to the company-scoped activity log so the Client Admin can
  // see who on their team has been participating. Attachments are logged
  // as a separate `document_uploaded` event so they show up in the
  // Documents view of the activity log too. Non-blocking.
  if (req.user.role === "client" && threadType === "project") {
    const summarySnippet = text
      ? text.length > 80 ? text.slice(0, 77) + "..." : text
      : attachmentUrl
        ? "Posted an attachment"
        : "New message";
    await recordClientTeamActivityFromRequest(req, {
      action: "comment_posted",
      section: "discussions",
      entityType: threadType,
      entityId: threadIdNum,
      summary: `Posted in discussion: ${summarySnippet}`,
    }).catch(() => undefined);

    if (attachmentUrl) {
      await recordClientTeamActivityFromRequest(req, {
        action: "document_uploaded",
        section: "documents",
        entityType: "project_resource",
        entityId: threadIdNum,
        summary: `Uploaded ${attachmentName ?? "an attachment"} to discussion.`,
        metadata: {
          attachmentUrl,
          attachmentName: attachmentName ?? null,
          attachmentMimeType: attachmentMimeType ?? null,
        },
      }).catch(() => undefined);
    }
  }

  res.status(201).json(formattedComment);
}
// Recipients for edit/delete broadcasts: thread participants plus anyone who has
// posted in the thread (still a participant), minus the actor. Shared by patch
// and delete so the two stay in sync.
async function resolveThreadBroadcastRecipients(threadType, threadIdNum, excludeUserId) {
  const recipientIds = new Set();
  let participantIds = null;
  if (isDirectDiscussionThread(threadType)) {
    participantIds = await getDirectConversationParticipantIds(threadIdNum);
    participantIds.forEach((uid) => recipientIds.add(uid));
  } else if (isProjectDiscussionThread(threadType)) {
    participantIds = await getDiscussionParticipantIds(threadIdNum, threadType);
    participantIds.forEach((uid) => recipientIds.add(uid));
  }
  const threadComments = await commentsTable
    .find({ threadType, threadId: threadIdNum })
    .select("authorId")
    .lean();
  for (const c of threadComments) {
    if (!participantIds || participantIds.has(c.authorId)) recipientIds.add(c.authorId);
  }
  recipientIds.delete(excludeUserId);
  return Array.from(recipientIds);
}

async function patchCommentsById(req, res) {
  const { content, mentionedUserIds: requestedMentionIds } = req.body;
  const id = parseIdParam(req.params["id"], "id");
  const existing = await commentsTable.findOne({ id, authorId: req.user.id });
  if (!existing) notFound("Comment");
  if (existing.isDeleted) badRequest("Cannot edit a deleted message.");

  const { threadType, threadId: threadIdNum } = existing;
  if (isDirectDiscussionThread(threadType)) {
    if (!(await canAccessDirectConversation(req.user, threadIdNum))) forbidden();
  } else if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
    if (threadType === "project") {
      await assertClientPermission(req, "discussions", "create");
    }
  } else if (threadType === "ticket") {
    await assertTicketAccess(req.user, threadIdNum);
  } else {
    forbidden();
  }

  const text = typeof content === "string" ? content.trim() : "";
  // A message must still carry either text or its original attachment.
  if (!text && !existing.attachmentUrl) {
    badRequest("Message text or an attachment is required.", "content");
  }

  // Re-resolve mentions from the edited text so newly added @mentions are
  // stored (and stale ones dropped), mirroring create behavior.
  let mentionIds = existing.mentionedUserIds ?? [];
  if (isCompanyTeamDiscussionThread(threadType)) {
    mentionIds = await resolveCompanyTeamMentionIds(req.user.id, requestedMentionIds, text, threadType);
  } else if (isProjectDiscussionThread(threadType)) {
    mentionIds = await resolveProjectMentionIds(
      threadIdNum,
      req.user.id,
      requestedMentionIds,
      text,
      threadType,
    );
  }

  const comment = await commentsTable.findOneAndUpdate(
    { id, authorId: req.user.id },
    { $set: { content: text, isEdited: true, mentionedUserIds: mentionIds } },
    { new: true },
  );
  if (!comment) notFound("Comment");

  const formattedComment = await formatComment(comment);

  // Broadcast so anyone viewing the thread reconciles the edited text live.
  try {
    const recipients = await resolveThreadBroadcastRecipients(
      threadType,
      threadIdNum,
      req.user.id,
    );
    if (recipients.length) {
      emitToUsers(recipients, "comment:updated", {
        threadType,
        threadId: threadIdNum,
        commentId: comment.id,
        comment: formattedComment,
      });
    }
  } catch (err) {
    console.error("Failed to broadcast comment update:", err);
  }

  res.json(formattedComment);
}

async function deleteCommentsById(req, res) {
  const id = parseIdParam(req.params["id"], "id");
  const existing = await commentsTable.findOne({ id });
  if (!existing) notFound("Comment");

  const { threadType, threadId: threadIdNum } = existing;
  // Verify the caller can access the thread at all (same gate as read/post).
  if (isDirectDiscussionThread(threadType)) {
    if (!(await canAccessDirectConversation(req.user, threadIdNum))) forbidden();
  } else if (isProjectDiscussionThread(threadType)) {
    if (!(await canAccessDiscussionThread(req.user, threadType, threadIdNum))) forbidden();
    if (threadType === "project") {
      await assertClientPermission(req, "discussions", "view");
    }
  } else if (threadType === "ticket") {
    await assertTicketAccess(req.user, threadIdNum);
  } else {
    forbidden();
  }

  // Only the original author or a super admin may delete a message.
  const isAuthor = existing.authorId === req.user.id;
  const isSuperAdmin = req.user.role === "super_admin";
  if (!isAuthor && !isSuperAdmin) forbidden();

  // Already deleted — return the current (blanked) representation idempotently.
  if (existing.isDeleted) {
    res.json(await formatComment(existing));
    return;
  }

  const attachmentUrl = existing.attachmentUrl ?? null;

  const comment = await commentsTable.findOneAndUpdate(
    { id },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        content: "",
        attachmentUrl: null,
        attachmentName: null,
        attachmentMimeType: null,
        mentionedUserIds: [],
      },
    },
    { new: true },
  );
  if (!comment) notFound("Comment");

  if (attachmentUrl) {
    deleteStoredFile(attachmentUrl).catch((err) => {
      console.error("Failed to delete comment attachment:", err);
    });
  }

  const formattedComment = await formatComment(comment);

  // Let everyone viewing the thread reconcile their cache in place.
  try {
    const recipients = await resolveThreadBroadcastRecipients(
      threadType,
      threadIdNum,
      req.user.id,
    );
    if (recipients.length) {
      emitToUsers(recipients, "comment:deleted", {
        threadType,
        threadId: threadIdNum,
        commentId: comment.id,
        comment: formattedComment,
      });
    }
  } catch (err) {
    console.error("Failed to broadcast comment deletion:", err);
  }

  res.json(formattedComment);
}
export {
  getComments,
  getCompanyTeamMentionCandidates,
  getProjectCommentPreviews,
  patchCommentsById,
  deleteCommentsById,
  postComments
};
