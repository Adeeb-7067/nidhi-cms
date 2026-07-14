import { toIso } from "../utils/mongo-list.js";

/**
 * Map a raw comment document to the API shape. Blanks body/attachments when deleted
 * so clients never see the original content after soft-delete.
 */
export function mapCommentRow(c, authorMap, repliesByParent) {
  const author = authorMap.get(c.authorId);
  const isDeleted = c.isDeleted ?? false;
  return {
    id: c.id,
    authorId: c.authorId,
    authorName: author?.name ?? "Unknown",
    authorAvatarUrl: author?.avatarUrl ?? null,
    authorRole: author?.role ?? "developer",
    threadType: c.threadType,
    threadId: c.threadId,
    content: isDeleted ? "" : c.content,
    attachmentUrl: isDeleted ? null : c.attachmentUrl ?? null,
    attachmentName: isDeleted ? null : c.attachmentName ?? null,
    attachmentMimeType: isDeleted ? null : c.attachmentMimeType ?? null,
    parentId: c.parentId,
    mentionedUserIds: c.mentionedUserIds ?? [],
    isEdited: c.isEdited,
    isDeleted,
    replies: (repliesByParent.get(c.id) ?? []).map((r) =>
      mapCommentRow(r, authorMap, repliesByParent),
    ),
    createdAt: toIso(c.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(c.updatedAt) ?? new Date().toISOString(),
  };
}
