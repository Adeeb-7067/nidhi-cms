import { apkReleasesTable, usersTable } from "../../models/schema/index.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";

/** GET /api/projects/:projectId/inventory/builds */
export async function getProjectsByProjectIdInventoryBuilds(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const query = { projectId };
  if (access.isClient) query.audience = "client_visible";

  const releases = await apkReleasesTable.find(query).sort({ createdAt: -1 }).lean();
  const uploaderIds = [...new Set(releases.map((r) => r.uploaderId).filter(Boolean))];
  const uploaders = uploaderIds.length
    ? await usersTable.find({ id: { $in: uploaderIds } }).select("id name").lean()
    : [];
  const uploaderById = new Map(uploaders.map((u) => [u.id, u]));
  const formatted = releases.map((r) => ({
    id: r.id,
    version: r.version,
    buildNumber: r.buildNumber,
    platform: r.platform,
    releaseType: r.releaseType,
    changelog: r.changelog,
    fileUrl: r.fileUrl,
    audience: r.audience,
    uploaderName: uploaderById.get(r.uploaderId)?.name ?? "Unknown",
    createdAt: r.createdAt.toISOString(),
  }));
  res.json({ builds: formatted, total: formatted.length });
}
