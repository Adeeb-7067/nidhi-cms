/** APK release visibility audiences */
export const APK_AUDIENCES = ["team_only", "client_visible", "all_visible"];

/** Audiences shown on the client portal and client-facing lists */
export const CLIENT_PORTAL_APK_AUDIENCES = ["client_visible", "all_visible"];

export function buildApkReleaseListFilter(user) {
  if (user?.role === "client") {
    return { audience: { $in: CLIENT_PORTAL_APK_AUDIENCES } };
  }
  return {};
}

export function resolveApkReleaseName(release) {
  const trimmed = typeof release?.name === "string" ? release.name.trim() : "";
  if (trimmed) return trimmed;
  if (release?.version) return `Build v${release.version}`;
  return "Untitled release";
}

/** Stored custom label from upload form (null for legacy rows). */
export function apkReleaseCustomName(release) {
  const trimmed = typeof release?.name === "string" ? release.name.trim() : "";
  return trimmed || null;
}

/** API payload: always include a non-empty label for UI lists. */
export function formatApkReleaseRow(release, uploaderName = "Unknown") {
  return {
    id: release.id,
    projectId: release.projectId,
    uploaderId: release.uploaderId,
    uploaderName,
    customName: apkReleaseCustomName(release),
    displayName: resolveApkReleaseName(release),
    name: resolveApkReleaseName(release),
    version: release.version,
    buildNumber: release.buildNumber,
    releaseType: release.releaseType,
    changelog: release.changelog ?? null,
    platform: release.platform,
    minOsVersion: release.minOsVersion ?? null,
    fileUrl: release.fileUrl,
    audience: release.audience,
    apkScheduleId: release.apkScheduleId ?? null,
    createdAt:
      release.createdAt instanceof Date
        ? release.createdAt.toISOString()
        : release.createdAt,
  };
}
