import { inventoryFoldersTable, getNextSequence } from "../../models/schema/index.js";
import { logInventoryActivity } from "../../services/inventory/helpers.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";
import { badRequest } from "../../utils/route-errors.js";

/** GET /api/projects/:projectId/inventory/folders */
export async function getProjectsByProjectIdInventoryFolders(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId);

  const folders = await inventoryFoldersTable.find({ projectId, deletedAt: null }).sort({ name: 1 });
  res.json(folders.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })));
}

/** POST /api/projects/:projectId/inventory/folders */
export async function postProjectsByProjectIdInventoryFolders(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);

  const { name, parentId } = req.body ?? {};
  if (!name) badRequest("name is required.", "name");

  const id = await getNextSequence("inventory_folders");
  const folder = await inventoryFoldersTable.create({
    id,
    projectId,
    parentId: parentId ?? null,
    name,
    createdBy: req.user.id,
  });
  await logInventoryActivity(req, projectId, "folder_created", "folder", id, name);
  res.status(201).json(folder);
}
