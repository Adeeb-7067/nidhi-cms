import { inventoryActivitiesTable, usersTable } from "@/models/schema";
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

  const formatted = await Promise.all(
    activities.map(async (a) => {
      const actor = await usersTable.findOne({ id: a.actorId });
      return {
        id: a.id,
        projectId: a.projectId,
        actorId: a.actorId,
        actorName: actor?.name ?? "Unknown",
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        entityName: a.entityName,
        oldVal: a.oldVal,
        newVal: a.newVal,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );
  res.json({ activities: formatted, total: formatted.length });
}
