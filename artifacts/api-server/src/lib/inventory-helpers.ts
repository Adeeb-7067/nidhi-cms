import type { Request } from "express";
import {
  inventoryActivitiesTable,
  notificationsTable,
  getNextSequence,
} from "@workspace/db/schema";
import { notifyUser } from "./realtime";

export async function logInventoryActivity(
  req: Request,
  projectId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  entityName: string,
  oldVal?: unknown,
  newVal?: unknown,
) {
  const id = await getNextSequence("inventory_activities");
  await inventoryActivitiesTable.create({
    id,
    projectId,
    actorId: req.user!.id,
    action,
    entityType,
    entityId,
    entityName,
    oldVal: oldVal ?? null,
    newVal: newVal ?? null,
    ipAddress: req.ip || req.socket?.remoteAddress || null,
  });
}

export async function notifyProjectMembers(
  projectId: number,
  excludeUserId: number,
  title: string,
  body: string,
  entityType: string,
  entityId: number,
) {
  const { projectMembersTable } = await import("@workspace/db/schema");
  const members = await projectMembersTable.find({ projectId });
  const recipientIds = new Set(members.map((m: { userId: number }) => m.userId));
  const { usersTable } = await import("@workspace/db/schema");
  const admins = await usersTable.find({ role: "super_admin", status: "active" });
  admins.forEach((a: { id: number }) => recipientIds.add(a.id));
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
        createdAt: new Date(),
      });
      notifyUser(userId, "notification", { type: "inventory", title, body, entityType, entityId });
    }),
  );
}
