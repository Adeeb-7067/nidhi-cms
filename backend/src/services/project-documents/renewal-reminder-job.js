import {
  ProjectDocuments,
  Projects,
  notificationsTable,
  projectMembersTable,
  usersTable,
  getNextSequence,
} from "../../models/schema/index.js";
import {
  daysUntilEnd,
  REMINDER_WINDOW_DAYS,
  startOfDay,
} from "./project-document-secrets.js";
import { notifyUser } from "../../lib/realtime.js";
import { logger } from "../../lib/logger.js";
import { isDatabaseConnected } from "../../lib/db.js";

function isSameCalendarDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function renewalTitle(kind, label) {
  const kindLabel =
    kind === "domain" ? "Domain" : kind === "hosting" ? "Hosting" : kind === "ssl" ? "SSL" : "Renewal";
  return label?.trim() ? `${kindLabel}: ${label.trim()}` : kindLabel;
}

async function resolveRecipientIds(projectId) {
  const members = await projectMembersTable.find({ projectId }).select({ userId: 1 }).lean();
  const recipientIds = new Set(members.map((m) => m.userId));
  const admins = await usersTable.find({ role: "super_admin", status: "active" }).select({ id: 1 }).lean();
  admins.forEach((a) => recipientIds.add(a.id));
  return [...recipientIds];
}

async function notifyRenewal({ projectId, projectName, renewal, daysLeft }) {
  const name = renewalTitle(renewal.kind, renewal.label);
  const endLabel = new Date(renewal.endDate).toLocaleDateString();
  const title =
    daysLeft <= 0 ? `${name} expired` : `${name} expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const body =
    daysLeft <= 0
      ? `${projectName}: renewal ended on ${endLabel}. Update dates in Project documents.`
      : `${projectName}: renew by ${endLabel} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left).`;

  const recipientIds = await resolveRecipientIds(projectId);
  await Promise.all(
    recipientIds.map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "project_document_renewal",
        title,
        body,
        entityType: "project_document_renewal",
        entityId: projectId,
        projectId,
        isRead: false,
        createdAt: new Date(),
      });
      notifyUser(userId, "notification", {
        type: "project_document_renewal",
        title,
        body,
        entityType: "project_document_renewal",
        entityId: projectId,
        projectId,
      });
    }),
  );
}

async function runRenewalReminderCheck() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping project document renewal reminders: database not connected");
    return;
  }

  const docs = await ProjectDocuments.find({ "renewals.0": { $exists: true } }).lean();
  if (!docs.length) return;

  const projectIds = [...new Set(docs.map((d) => d.projectId))];
  const projects = await Projects.find({ id: { $in: projectIds } }).select({ id: 1, name: 1 }).lean();
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const now = new Date();

  for (const doc of docs) {
    const projectName = projectNameById.get(doc.projectId) ?? `Project #${doc.projectId}`;

    for (const renewal of doc.renewals ?? []) {
      if (!renewal?.endDate) continue;

      const daysLeft = daysUntilEnd(renewal.endDate);
      if (daysLeft == null || daysLeft > REMINDER_WINDOW_DAYS) continue;
      if (renewal.lastReminderAt && isSameCalendarDay(new Date(renewal.lastReminderAt), now)) continue;

      try {
        await notifyRenewal({ projectId: doc.projectId, projectName, renewal, daysLeft });
        await ProjectDocuments.updateOne(
          { id: doc.id, "renewals.id": renewal.id },
          { $set: { "renewals.$.lastReminderAt": now } },
        );
      } catch (err) {
        logger.error(
          { err, documentId: doc.id, renewalId: renewal.id, projectId: doc.projectId },
          "Failed to send project document renewal reminder",
        );
      }
    }
  }
}

function startProjectDocumentRenewalReminderJob() {
  const intervalMs = 60 * 60 * 1000;
  const tick = () => {
    runRenewalReminderCheck().catch((err) =>
      logger.error({ err }, "Project document renewal reminder job failed"),
    );
  };
  setInterval(tick, intervalMs);
  return tick;
}

export { startProjectDocumentRenewalReminderJob, runRenewalReminderCheck };
