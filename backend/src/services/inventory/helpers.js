import {
  inventoryActivitiesTable,
  notificationsTable,
  getNextSequence
} from "../../models/schema/index.js";
import { notifyUser } from "../../lib/realtime.js";
async function logInventoryActivity(req, projectId, action, entityType, entityId, entityName, oldVal, newVal) {
  const id = await getNextSequence("inventory_activities");
  await inventoryActivitiesTable.create({
    id,
    projectId,
    actorId: req.user.id,
    action,
    entityType,
    entityId,
    entityName,
    oldVal: oldVal ?? null,
    newVal: newVal ?? null,
    ipAddress: req.ip || req.socket?.remoteAddress || null
  });
}
async function notifyProjectMembers(projectId, excludeUserId, title, body, entityType, entityId) {
  const { projectMembersTable } = await import("../../models/schema/index.js");
  const members = await projectMembersTable.find({ projectId });
  const recipientIds = new Set(members.map((m) => m.userId));
  const { usersTable } = await import("../../models/schema/index.js");
  const admins = await usersTable.find({ role: "super_admin", status: "active" });
  admins.forEach((a) => recipientIds.add(a.id));
  recipientIds.delete(excludeUserId);
  await Promise.all(
    Array.from(recipientIds).map(async (userId) => {
      const notifId = await getNextSequence("notifications");
      await notificationsTable.create({
        id: notifId,
        userId,
        type: "inventory",
        title,
        body,
        entityType,
        entityId,
        isRead: false,
        createdAt: /* @__PURE__ */ new Date()
      });
      notifyUser(userId, "notification", { type: "inventory", title, body, entityType, entityId });
    })
  );
}
export {
  logInventoryActivity,
  notifyProjectMembers
};
