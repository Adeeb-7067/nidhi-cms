import { apkReleasesTable, usersTable } from "../../models/schema/index.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";

/** GET /api/projects/:projectId/inventory/builds */
export async function getProjectsByProjectIdInventoryBuilds(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const query = { projectId };
  if (access.isClient) query.audience = "client_visible";

  const releases = await apkReleasesTable.find(query).sort({ createdAt: -1 });
  const formatted = await Promise.all(
    releases.map(async (r) => {
      const uploader = await usersTable.findOne({ id: r.uploaderId });
      return {
        id: r.id,
        version: r.version,
        buildNumber: r.buildNumber,
        platform: r.platform,
        releaseType: r.releaseType,
        changelog: r.changelog,
        fileUrl: r.fileUrl,
        audience: r.audience,
        uploaderName: uploader?.name ?? "Unknown",
        createdAt: r.createdAt.toISOString(),
      };
    }),
  );
  res.json({ builds: formatted, total: formatted.length });
}
