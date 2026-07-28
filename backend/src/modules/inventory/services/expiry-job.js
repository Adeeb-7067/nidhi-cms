import {
  inventorySubscriptionsTable,
  notificationsTable,
  getNextSequence,
  projectMembersTable,
  usersTable
} from "../../../models/schema/index.js";
import { notifyUser } from "../../../lib/realtime.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";
const DAY_MS = 864e5;
async function notifyExpiry(projectId, title, body, entityId) {
  const members = await projectMembersTable.find({ projectId });
  const recipientIds = new Set(members.map((m) => m.userId));
  const admins = await usersTable.find({ role: "super_admin", status: "active" });
  admins.forEach((a) => recipientIds.add(a.id));
  await Promise.all(
    Array.from(recipientIds).map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "inventory",
        title,
        body,
        entityType: "subscription",
        entityId,
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(userId, "notification", { type: "inventory", title, body, entityType: "subscription", entityId });
    })
  );
}
async function runExpiryCheck() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping inventory expiry check: database not connected");
    return;
  }
  const now = Date.now();
  const subs = await inventorySubscriptionsTable.find({ deletedAt: null, status: "active" });
  for (const sub of subs) {
    const days = Math.ceil((sub.expiresAt.getTime() - now) / DAY_MS);
    if (days <= 30 && days > 7 && !sub.alertSent30) {
      await notifyExpiry(
        sub.projectId,
        "Subscription expiring soon",
        `${sub.name} expires in ${days} days`,
        sub.id
      );
      await inventorySubscriptionsTable.updateOne({ id: sub.id }, { $set: { alertSent30: true } });
    } else if (days <= 7 && days > 0 && !sub.alertSent7) {
      await notifyExpiry(
        sub.projectId,
        "Subscription expiring this week",
        `${sub.name} expires in ${days} days`,
        sub.id
      );
      await inventorySubscriptionsTable.updateOne({ id: sub.id }, { $set: { alertSent7: true } });
    } else if (days <= 0 && !sub.alertSentExpired) {
      await notifyExpiry(
        sub.projectId,
        "Subscription expired",
        `${sub.name} has expired`,
        sub.id
      );
      await inventorySubscriptionsTable.updateOne(
        { id: sub.id },
        { $set: { alertSentExpired: true, status: "expired" } }
      );
    }
  }
}
function startInventoryExpiryJob() {
  const intervalMs = 6 * 60 * 60 * 1e3;
  const tick = () => {
    runExpiryCheck().catch((err) => logger.error({ err }, "Inventory expiry job failed"));
  };
  setInterval(tick, intervalMs);
  return tick;
}
export {
  startInventoryExpiryJob
};
