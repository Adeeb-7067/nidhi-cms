import { inventorySubscriptionsTable, getNextSequence } from "@/models/schema";
import { logInventoryActivity } from "@/services/inventory/helpers";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";
import { badRequest } from "@/utils/route-errors";

/** GET /api/projects/:projectId/inventory/subscriptions */
export async function getProjectsByProjectIdInventorySubscriptions(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId);

  const subs = await inventorySubscriptionsTable
    .find({ projectId, deletedAt: null })
    .sort({ expiresAt: 1 });

  res.json(
    subs.map((s) => ({
      ...s,
      expiresAt: s.expiresAt.toISOString(),
      lastRenewedAt: s.lastRenewedAt?.toISOString() ?? null,
      daysUntilExpiry: Math.ceil((s.expiresAt.getTime() - Date.now()) / 86400000),
    })),
  );
}

/** POST /api/projects/:projectId/inventory/subscriptions */
export async function postProjectsByProjectIdInventorySubscriptions(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);

  const { type, name, expiresAt, provider, cost, renewalUrl, notes } = req.body ?? {};
  if (!type || !name || !expiresAt) {
    badRequest("type, name, and expiresAt are required.", !type ? "type" : !name ? "name" : "expiresAt");
  }

  const id = await getNextSequence("inventory_subscriptions");
  const sub = await inventorySubscriptionsTable.create({
    id,
    projectId,
    type,
    name,
    provider: provider ?? null,
    cost: cost ?? null,
    renewalUrl: renewalUrl ?? null,
    expiresAt: new Date(expiresAt),
    notes: notes ?? null,
  });
  await logInventoryActivity(req, projectId, "subscription_added", "subscription", id, name);
  res.status(201).json(sub);
}
