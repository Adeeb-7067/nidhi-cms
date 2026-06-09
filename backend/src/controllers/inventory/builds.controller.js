import { apkReleasesTable, usersTable } from "../../models/schema/index.js";
import { CLIENT_PORTAL_APK_AUDIENCES, formatApkReleaseRow } from "../../services/apk-access.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";

/** GET /api/projects/:projectId/inventory/builds */
export async function getProjectsByProjectIdInventoryBuilds(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const query = { projectId };
  if (access.isClient) query.audience = { $in: CLIENT_PORTAL_APK_AUDIENCES };

  const releases = await apkReleasesTable.find(query).sort({ createdAt: -1 }).lean();
  const uploaderIds = [...new Set(releases.map((r) => r.uploaderId).filter(Boolean))];
  const uploaders = uploaderIds.length
    ? await usersTable.find({ id: { $in: uploaderIds } }).select("id name").lean()
    : [];
  const uploaderById = new Map(uploaders.map((u) => [u.id, u]));
  const formatted = releases.map((r) => {
    const row = formatApkReleaseRow(r, uploaderById.get(r.uploaderId)?.name ?? "Unknown");
    return {
      id: row.id,
      name: row.displayName,
      displayName: row.displayName,
      customName: row.customName,
      version: row.version,
      buildNumber: row.buildNumber,
      platform: row.platform,
      releaseType: row.releaseType,
      changelog: row.changelog,
      fileUrl: row.fileUrl,
      audience: row.audience,
      uploaderName: row.uploaderName,
      createdAt: row.createdAt,
    };
  });
  res.json({ builds: formatted, total: formatted.length });
}
