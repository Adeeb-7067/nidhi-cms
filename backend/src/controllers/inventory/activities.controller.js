import { inventoryActivitiesTable, usersTable } from "../../models/schema/index.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";

/** GET /api/projects/:projectId/inventory/activities */
export async function getProjectsByProjectIdInventoryActivities(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId);

  const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
  const activities = await inventoryActivitiesTable
    .find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit);

  const actorIds = [...new Set(activities.map((a) => a.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await usersTable.find({ id: { $in: actorIds } }).select("id name").lean()
    : [];
  const actorById = new Map(actors.map((u) => [u.id, u]));
  const formatted = activities.map((a) => ({
    id: a.id,
    projectId: a.projectId,
    actorId: a.actorId,
    actorName: actorById.get(a.actorId)?.name ?? "Unknown",
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    entityName: a.entityName,
    oldVal: a.oldVal,
    newVal: a.newVal,
    createdAt: a.createdAt.toISOString(),
  }));
  res.json({ activities: formatted, total: formatted.length });
}
