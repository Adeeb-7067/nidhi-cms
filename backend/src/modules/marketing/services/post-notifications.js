import {
  notificationsTable,
  clientsTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { notifyUser } from "../../../lib/realtime.js";
import { sendWebPushToUser } from "../../collab/services/push-notifications.js";
import { logger } from "../../../lib/logger.js";
import { loadWorkspaceLabelsByAccountIds } from "./helpers.js";

function textPreview(value, empty = "No details") {
  const text = String(value ?? "").trim();
  if (!text) return empty;
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function formatWhen(scheduledAt) {
  if (!scheduledAt) return null;
  const d = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function resolveClientLabel(doc) {
  try {
    if (doc?.accountId != null) {
      const labels = await loadWorkspaceLabelsByAccountIds([doc.accountId]);
      const fromWorkspace = labels.get(doc.accountId);
      if (fromWorkspace) return fromWorkspace;
    }
    if (doc?.companyId != null) {
      const company = await clientsTable.findOne({ id: doc.companyId }).lean();
      return company?.companyName ?? "Digital project";
    }
  } catch (err) {
    logger.warn({ err, accountId: doc?.accountId }, "Failed to resolve digital client label");
  }
  return "Digital project";
}

/**
 * Persist in-app notification + realtime socket + FCM push.
 */
export async function deliverMarketingNotification({
  userId,
  type,
  title,
  body,
  entityType,
  entityId,
  accountId = null,
  href = "/marketing",
}) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  if (!title || !body) return null;

  const notifId = await getNextSequence("notifications");
  await notificationsTable.create({
    id: notifId,
    userId: uid,
    type,
    title,
    body,
    entityType,
    entityId,
    relatedId: entityId,
    companyId: null,
    projectId: null,
    isRead: false,
  });

  const payload = {
    id: notifId,
    type,
    title,
    body,
    entityType,
    entityId,
    accountId: accountId ?? null,
  };

  await notifyUser(uid, "notification", payload);
  void sendWebPushToUser(uid, {
    title,
    body,
    data: {
      type,
      entityType,
      entityId,
      href,
    },
  }).catch((err) => {
    logger.warn({ err, userId: uid, entityId, type }, "Digital push failed");
  });

  return notifId;
}

async function notifyAssignee({
  actorId,
  assigneeId,
  accountId,
  companyId,
  entityType,
  entityId,
  type,
  title,
  body,
  href,
}) {
  const target = assigneeId != null ? Number(assigneeId) : null;
  if (!target || !Number.isFinite(target)) return null;
  if (actorId != null && Number(actorId) === target) return null;

  try {
    return await deliverMarketingNotification({
      userId: target,
      type,
      title,
      body,
      entityType,
      entityId,
      accountId,
      href,
    });
  } catch (err) {
    logger.error(
      { err, entityId, assigneeId: target, type },
      "Failed to notify digital assignee",
    );
    return null;
  }
}

/** Calendar post assigned. */
export async function notifyMarketingPostAssigned({ post, actorId }) {
  const clientName = await resolveClientLabel(post);
  const when = formatWhen(post.scheduledAt);
  return notifyAssignee({
    actorId,
    assigneeId: post.assigneeId,
    accountId: post.accountId,
    companyId: post.companyId,
    entityType: "marketing_post",
    entityId: post.id,
    type: "marketing_post_assigned",
    title: "Calendar post assigned to you",
    body: when
      ? `${clientName}: ${textPreview(post.caption, "No caption yet")} — scheduled ${when}`
      : `${clientName}: ${textPreview(post.caption, "No caption yet")}`,
    href: "/marketing/calendar",
  });
}

/** Reminder at schedule time. */
export async function notifyMarketingPostScheduleReminder(post) {
  const recipientId =
    post?.assigneeId != null && Number.isFinite(Number(post.assigneeId))
      ? Number(post.assigneeId)
      : post?.createdBy != null && Number.isFinite(Number(post.createdBy))
        ? Number(post.createdBy)
        : null;
  if (!recipientId) return null;

  const clientName = await resolveClientLabel(post);
  const when = formatWhen(post.scheduledAt) ?? "now";
  try {
    return await deliverMarketingNotification({
      userId: recipientId,
      type: "marketing_post_reminder",
      title: "Scheduled post reminder",
      body: `${clientName}: time to publish — ${textPreview(post.caption, "No caption yet")} (${when})`,
      entityType: "marketing_post",
      entityId: post.id,
      accountId: post.accountId,
      href: "/marketing/calendar",
    });
  } catch (err) {
    logger.error({ err, postId: post.id, recipientId }, "Failed to send marketing post reminder");
    return null;
  }
}

/** Daily task assigned. */
export async function notifyMarketingTaskAssigned({ task, actorId }) {
  const clientName = await resolveClientLabel(task);
  const deadline = formatDateOnly(task.deadline);
  return notifyAssignee({
    actorId,
    assigneeId: task.assigneeId,
    accountId: task.accountId,
    companyId: task.companyId,
    entityType: "marketing_task",
    entityId: task.id,
    type: "marketing_task_assigned",
    title: "Digital task assigned to you",
    body: deadline
      ? `${clientName}: ${textPreview(task.title)} — due ${deadline}`
      : `${clientName}: ${textPreview(task.title)}`,
    href: "/marketing/tasks",
  });
}

/** Approval queue item assigned. */
export async function notifyMarketingApprovalAssigned({ approval, actorId }) {
  const clientName = await resolveClientLabel(approval);
  return notifyAssignee({
    actorId,
    assigneeId: approval.assigneeId,
    accountId: approval.accountId,
    companyId: approval.companyId,
    entityType: "marketing_approval",
    entityId: approval.id,
    type: "marketing_approval_assigned",
    title: "Approval assigned to you",
    body: `${clientName}: ${textPreview(approval.title)}`,
    href: "/marketing/approvals",
  });
}

/** Approval stage moved — notify assignee + creator (except actor). */
export async function notifyMarketingApprovalStageChanged({
  approval,
  actorId,
  stageLabel,
}) {
  const clientName = await resolveClientLabel(approval);
  const recipients = new Set();
  if (approval.assigneeId != null) recipients.add(Number(approval.assigneeId));
  if (approval.createdBy != null) recipients.add(Number(approval.createdBy));
  if (actorId != null) recipients.delete(Number(actorId));

  const title = "Approval stage updated";
  const body = `${clientName}: ${textPreview(approval.title)} → ${stageLabel}`;

  await Promise.all(
    [...recipients]
      .filter((id) => Number.isFinite(id) && id > 0)
      .map((userId) =>
        deliverMarketingNotification({
          userId,
          type: "marketing_approval_stage",
          title,
          body,
          entityType: "marketing_approval",
          entityId: approval.id,
          accountId: approval.accountId,
          href: "/marketing/approvals",
        }).catch((err) => {
          logger.warn({ err, userId, approvalId: approval.id }, "Approval stage push failed");
          return null;
        }),
      ),
  );
}

/** Graphic / video / content queue item assigned. */
export async function notifyMarketingQueueAssigned({
  item,
  actorId,
  kind, // graphic | video | content
}) {
  const clientName = await resolveClientLabel(item);
  const meta = {
    graphic: {
      entityType: "marketing_graphic",
      type: "marketing_graphic_assigned",
      title: "Graphic request assigned to you",
      href: "/marketing/graphics",
    },
    video: {
      entityType: "marketing_video",
      type: "marketing_video_assigned",
      title: "Video request assigned to you",
      href: "/marketing/videos",
    },
    content: {
      entityType: "marketing_content",
      type: "marketing_content_assigned",
      title: "Content item assigned to you",
      href: "/marketing/content",
    },
  }[kind];
  if (!meta) return null;

  const due = formatDateOnly(item.dueDate);
  return notifyAssignee({
    actorId,
    assigneeId: item.assigneeId,
    accountId: item.accountId,
    companyId: item.companyId,
    entityType: meta.entityType,
    entityId: item.id,
    type: meta.type,
    title: meta.title,
    body: due
      ? `${clientName}: ${textPreview(item.title)} — due ${due}`
      : `${clientName}: ${textPreview(item.title)}`,
    href: meta.href,
  });
}
