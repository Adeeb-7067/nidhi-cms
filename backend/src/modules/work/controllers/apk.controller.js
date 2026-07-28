import { apkReleasesTable, usersTable, getNextSequence } from "../../../models/schema/index.js";
import { validateStoredFileUrl } from "../../../lib/file-storage.js";
import { badRequest, notFound, optionalString } from "../../../utils/route-errors.js";
import {
  APK_AUDIENCES,
  CLIENT_PORTAL_APK_AUDIENCES,
  formatApkReleaseRow,
} from "../services/apk-access.js";
import { assertProjectAccess } from "../../access/services/access-helpers.js";
import { forbidden } from "../../../utils/route-errors.js";

async function formatRelease(release) {
  const uploader = await usersTable.findOne({ id: release.uploaderId });
  return formatApkReleaseRow(release, uploader?.name ?? "Unknown");
}

async function postProjectsByIdApkReleases(req, res) {
  const projectId = parseInt(req.params["id"]);
  const { isClient } = await assertProjectAccess(req, projectId);
  if (isClient) {
    forbidden("Client accounts cannot upload APK releases.");
  }
  const {
    name,
    version,
    buildNumber,
    releaseType,
    changelog,
    platform,
    minOsVersion,
    fileUrl,
    audience,
    apkScheduleId,
  } = req.body;
  const releaseName = optionalString(name);
  if (!releaseName) badRequest("APK name is required.", "name");
  if (!version || !releaseType || !platform || !fileUrl || !audience) {
    badRequest("version, releaseType, platform, fileUrl, and audience are required.");
  }
  if (!APK_AUDIENCES.includes(audience)) {
    badRequest(
      `audience must be one of: ${APK_AUDIENCES.join(", ")}.`,
      "audience",
    );
  }
  validateStoredFileUrl(fileUrl, "fileUrl");
  const nextId = await getNextSequence("apk_releases");
  const release = await apkReleasesTable.create({
    id: nextId,
    projectId,
    uploaderId: req.user.id,
    name: releaseName,
    version,
    buildNumber: buildNumber ?? 1,
    releaseType,
    changelog: changelog ?? null,
    platform,
    minOsVersion: minOsVersion ?? null,
    fileUrl,
    audience,
    apkScheduleId: apkScheduleId ?? null,
  });
  res.status(201).json(await formatRelease(release));
}
async function getApkReleasesById(req, res) {
  const release = await apkReleasesTable.findOne({ id: parseInt(req.params["id"]) });
  if (!release) notFound("APK release");
  const { isClient } = await assertProjectAccess(req, release.projectId);
  if (isClient && !CLIENT_PORTAL_APK_AUDIENCES.includes(release.audience)) {
    forbidden("This release is not available on the client portal.");
  }
  res.json(await formatRelease(release));
}
export {
  getApkReleasesById,
  postProjectsByIdApkReleases
};
