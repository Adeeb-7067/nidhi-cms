import { apkReleasesTable, usersTable, getNextSequence } from "@/models/schema";
import { validateStoredFileUrl } from "@/lib/file-storage";
import { badRequest, notFound } from "@/utils/route-errors";
async function formatRelease(release) {
  const uploader = await usersTable.findOne({ id: release.uploaderId });
  return {
    id: release.id,
    projectId: release.projectId,
    uploaderId: release.uploaderId,
    uploaderName: uploader?.name ?? "Unknown",
    version: release.version,
    buildNumber: release.buildNumber,
    releaseType: release.releaseType,
    changelog: release.changelog,
    platform: release.platform,
    minOsVersion: release.minOsVersion,
    fileUrl: release.fileUrl,
    audience: release.audience,
    apkScheduleId: release.apkScheduleId,
    createdAt: release.createdAt.toISOString()
  };
}
async function postProjectsByIdApkReleases(req, res) {
  const projectId = parseInt(req.params["id"]);
  const { version, buildNumber, releaseType, changelog, platform, minOsVersion, fileUrl, audience, apkScheduleId } = req.body;
  if (!version || !releaseType || !platform || !fileUrl || !audience) {
    badRequest("version, releaseType, platform, fileUrl, and audience are required.");
  }
  validateStoredFileUrl(fileUrl, "fileUrl");
  const nextId = await getNextSequence("apk_releases");
  const release = await apkReleasesTable.create({
    id: nextId,
    projectId,
    uploaderId: req.user.id,
    version,
    buildNumber: buildNumber ?? 1,
    releaseType,
    changelog: changelog ?? null,
    platform,
    minOsVersion: minOsVersion ?? null,
    fileUrl,
    audience,
    apkScheduleId: apkScheduleId ?? null
  });
  res.status(201).json(await formatRelease(release));
}
async function getApkReleasesById(req, res) {
  const release = await apkReleasesTable.findOne({ id: parseInt(req.params["id"]) });
  if (!release) notFound("APK release");
  res.json(await formatRelease(release));
}
export {
  getApkReleasesById,
  postProjectsByIdApkReleases
};
