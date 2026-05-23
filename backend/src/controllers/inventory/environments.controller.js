import { inventoryEnvironmentsTable, getNextSequence } from "../../models/schema/index.js";
import { clientVisibilityFilter } from "../../services/access/inventory-access.js";
import { logInventoryActivity, notifyProjectMembers } from "../../services/inventory/helpers.js";
import { guardInventoryAccess, parseProjectIdParam, parseInventoryEntityId } from "./guard.js";
import { badRequest, notFound } from "../../utils/route-errors.js";

/** GET /api/projects/:projectId/inventory/environments */
export async function getProjectsByProjectIdInventoryEnvironments(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const envs = await inventoryEnvironmentsTable.find({
    projectId,
    deletedAt: null,
    ...clientVisibilityFilter(access.isClient),
  });
  res.json(
    envs.map((e) => ({
      ...e,
      lastDeployedAt: e.lastDeployedAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
}

/** POST /api/projects/:projectId/inventory/environments */
export async function postProjectsByProjectIdInventoryEnvironments(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);

  const { envType, name, url, deploymentStatus, healthStatus, hostingDetails, deploymentNotes, visibility } =
    req.body ?? {};
  if (!envType || !name) {
    badRequest("envType and name are required.", !envType ? "envType" : "name");
  }

  const id = await getNextSequence("inventory_environments");
  const env = await inventoryEnvironmentsTable.create({
    id,
    projectId,
    envType,
    name,
    url: url ?? null,
    deploymentStatus: deploymentStatus ?? "active",
    healthStatus: healthStatus ?? "unknown",
    hostingDetails: hostingDetails ?? null,
    deploymentNotes: deploymentNotes ?? null,
    visibility: visibility ?? "team_only",
  });
  await logInventoryActivity(req, projectId, "environment_created", "environment", id, name);
  await notifyProjectMembers(projectId, req.user.id, "Environment updated", name, "environment", id);
  res.status(201).json(env);
}

/** PATCH /api/projects/:projectId/inventory/environments/:id */
export async function patchProjectsByProjectIdInventoryEnvironmentsById(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);
  const id = parseInventoryEntityId(req);

  const env = await inventoryEnvironmentsTable.findOneAndUpdate(
    { id, projectId },
    { $set: { ...req.body, updatedAt: new Date() } },
    { new: true },
  );
  if (!env) notFound("Environment");

  await logInventoryActivity(req, projectId, "environment_updated", "environment", id, env.name);
  res.json(env);
}
