import { inventoryResourcesTable, usersTable, getNextSequence } from "../../models/schema/index.js";
import { validateStoredFileUrl } from "../../lib/file-storage.js";
import { clientVisibilityFilter } from "../../services/access/inventory-access.js";
import { logInventoryActivity, notifyProjectMembers } from "../../services/inventory/helpers.js";
import { guardInventoryAccess, parseProjectIdParam, parseInventoryEntityId } from "./guard.js";
import { badRequest, forbidden, notFound } from "../../utils/route-errors.js";

/** GET /api/projects/:projectId/inventory/resources */
export async function getProjectsByProjectIdInventoryResources(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const { search, folderId, type, category, page = "1", limit = "30" } = req.query;
  const p = parseInt(page, 10);
  const l = parseInt(limit, 10);
  const query = {
    projectId,
    deletedAt: null,
    ...clientVisibilityFilter(access.isClient),
  };
  if (folderId === "null") query.folderId = null;
  else if (folderId) query.folderId = parseInt(folderId, 10);
  if (type) query.type = type;
  if (category) query.category = category;
  if (search) query.name = { $regex: search, $options: "i" };

  const [items, total] = await Promise.all([
    inventoryResourcesTable.find(query).sort({ updatedAt: -1 }).skip((p - 1) * l).limit(l),
    inventoryResourcesTable.countDocuments(query),
  ]);

  const uploaderIds = [...new Set(items.map((r) => r.uploadedBy).filter(Boolean))];
  const uploaders = uploaderIds.length
    ? await usersTable.find({ id: { $in: uploaderIds } }).select("id name").lean()
    : [];
  const uploaderById = new Map(uploaders.map((u) => [u.id, u]));
  const resources = items.map((r) => {
    const uploader = uploaderById.get(r.uploadedBy);
    return {
      id: r.id,
      projectId: r.projectId,
      folderId: r.folderId,
      type: r.type,
      name: r.name,
      description: r.description,
      url: r.url,
      fileUrl: r.fileUrl,
      mimeType: r.mimeType,
      fileSize: r.fileSize,
      tags: r.tags,
      category: r.category,
      visibility: r.visibility,
      version: r.version,
      parentResourceId: r.parentResourceId,
      uploadedBy: r.uploadedBy,
      uploaderName: uploader?.name ?? "Unknown",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
  res.json({ resources, total, page: p, limit: l });
}

/** POST /api/projects/:projectId/inventory/resources */
export async function postProjectsByProjectIdInventoryResources(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);
  if (access.isClient && req.body.visibility !== "client_visible") {
    forbidden("Clients can only add client-visible resources.");
  }

  const {
    name, type, description, url, fileUrl, mimeType, fileSize, folderId, tags, category, visibility,
  } = req.body ?? {};
  if (!name) badRequest("name is required.", "name");

  validateStoredFileUrl(fileUrl, "fileUrl");

  const id = await getNextSequence("inventory_resources");
  const resource = await inventoryResourcesTable.create({
    id,
    projectId,
    folderId: folderId ?? null,
    type: type ?? "file",
    name,
    description: description ?? null,
    url: url ?? null,
    fileUrl: fileUrl ?? null,
    mimeType: mimeType ?? null,
    fileSize: fileSize ?? null,
    tags: tags ?? [],
    category: category ?? null,
    visibility: visibility ?? "team_only",
    uploadedBy: req.user.id,
  });

  await logInventoryActivity(req, projectId, "resource_uploaded", "resource", id, name);
  await notifyProjectMembers(projectId, req.user.id, "New resource uploaded", name, "resource", id);
  res.status(201).json(resource);
}

/** PATCH /api/projects/:projectId/inventory/resources/:id */
export async function patchProjectsByProjectIdInventoryResourcesById(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);
  const id = parseInventoryEntityId(req);

  validateStoredFileUrl(req.body?.fileUrl, "fileUrl");

  const resource = await inventoryResourcesTable.findOneAndUpdate(
    { id, projectId, deletedAt: null },
    { $set: { ...req.body, updatedAt: new Date() } },
    { new: true },
  );
  if (!resource) notFound("Resource");

  await logInventoryActivity(req, projectId, "resource_updated", "resource", id, resource.name);
  res.json(resource);
}

/** DELETE /api/projects/:projectId/inventory/resources/:id */
export async function deleteProjectsByProjectIdInventoryResourcesById(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);
  const id = parseInventoryEntityId(req);

  const resource = await inventoryResourcesTable.findOneAndUpdate(
    { id, projectId },
    { $set: { deletedAt: new Date() } },
    { new: true },
  );
  if (!resource) notFound("Resource");

  await logInventoryActivity(req, projectId, "resource_deleted", "resource", id, resource.name);
  res.json({ message: "Deleted" });
}
