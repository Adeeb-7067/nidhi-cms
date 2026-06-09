import { commentsTable, usersTable } from "../models/schema/index.js";
import { toIso } from "../utils/mongo-list.js";
import {
  getAccessibleProjectIds,
  discussionThreadTypesForRole,
  canAccessCompanyTeamDiscussion,
  COMPANY_TEAM_THREAD,
  COMPANY_TEAM_THREAD_ID,
} from "./discussion-project-access.js";

function commentPreviewText(row) {
  const text = typeof row.content === "string" ? row.content.trim() : "";
  if (text) return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  if (row.attachmentUrl) {
    const name = row.attachmentName?.toLowerCase() ?? "";
    if (row.attachmentMimeType === "application/pdf" || name.endsWith(".pdf")) {
      return "Sent a PDF";
    }
    if (
      row.attachmentMimeType === "application/vnd.android.package-archive" ||
      name.endsWith(".apk")
    ) {
      return "Sent an APK";
    }
    if (
      row.attachmentMimeType?.startsWith("audio/") ||
      /\.(webm|ogg|mp3|m4a|wav)$/.test(name)
    ) {
      return "Sent a voice message";
    }
    if (row.attachmentMimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) {
      return "Sent an image";
    }
    return "Sent an attachment";
  }
  return "New message";
}

/** Latest message snapshot per project thread for chat list sorting/previews. */
export async function getProjectDiscussionPreviews(user) {
  const projectIds = await getAccessibleProjectIds(user);
  const threadTypes = discussionThreadTypesForRole(user.role);
  const includeCompanyTeam = canAccessCompanyTeamDiscussion(user.role);
  if ((!projectIds.length && !includeCompanyTeam) || !threadTypes.length) {
    return { previews: [] };
  }

  const threadIdFilter = includeCompanyTeam
    ? { $in: [...projectIds, COMPANY_TEAM_THREAD_ID] }
    : { $in: projectIds };

  const latestRows = await commentsTable
    .aggregate([
      {
        $match: {
          threadType: { $in: threadTypes },
          threadId: threadIdFilter,
          $or: [{ parentId: null }, { parentId: { $exists: false } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { threadType: "$threadType", threadId: "$threadId" },
          id: { $first: "$id" },
          authorId: { $first: "$authorId" },
          content: { $first: "$content" },
          attachmentUrl: { $first: "$attachmentUrl" },
          attachmentName: { $first: "$attachmentName" },
          attachmentMimeType: { $first: "$attachmentMimeType" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ])
    .exec();

  const authorIds = [...new Set(latestRows.map((r) => r.authorId).filter((id) => id != null))];
  const authors = authorIds.length
    ? await usersTable.find({ id: { $in: authorIds } }, { id: 1, name: 1 }).lean().exec()
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a.name ?? "Unknown"]));

  const previews = [];

  if (includeCompanyTeam) {
    const row = latestRows.find(
      (r) => r._id.threadId === COMPANY_TEAM_THREAD_ID && r._id.threadType === COMPANY_TEAM_THREAD,
    );
    if (!row) {
      previews.push({
        projectId: COMPANY_TEAM_THREAD_ID,
        threadType: COMPANY_TEAM_THREAD,
        lastMessageAt: null,
        lastPreview: null,
        lastAuthorName: null,
        lastAuthorId: null,
      });
    } else {
      const createdAt = toIso(row.createdAt) ?? new Date().toISOString();
      previews.push({
        projectId: COMPANY_TEAM_THREAD_ID,
        threadType: COMPANY_TEAM_THREAD,
        lastMessageAt: createdAt,
        lastPreview: commentPreviewText(row),
        lastAuthorName: authorMap.get(row.authorId) ?? "Unknown",
        lastAuthorId: row.authorId,
      });
    }
  }

  for (const projectId of projectIds) {
    for (const threadType of threadTypes) {
      if (threadType === COMPANY_TEAM_THREAD) continue;
      const row = latestRows.find(
        (r) => r._id.threadId === projectId && r._id.threadType === threadType,
      );
      if (!row) {
        previews.push({
          projectId,
          threadType,
          lastMessageAt: null,
          lastPreview: null,
          lastAuthorName: null,
          lastAuthorId: null,
        });
        continue;
      }
      const createdAt = toIso(row.createdAt) ?? new Date().toISOString();
      previews.push({
        projectId,
        threadType,
        lastMessageAt: createdAt,
        lastPreview: commentPreviewText(row),
        lastAuthorName: authorMap.get(row.authorId) ?? "Unknown",
        lastAuthorId: row.authorId,
      });
    }
  }

  return { previews };
}
