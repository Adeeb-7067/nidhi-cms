import { Router } from "express";
import { db } from "../lib/db";
import { apkReleasesTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function formatRelease(release: typeof apkReleasesTable.$inferSelect) {
  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, release.uploaderId));
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
    createdAt: release.createdAt.toISOString(),
  };
}

// POST /api/projects/:id/apk-releases (handled in projects.ts)
// POST /api/projects/:id/apk-releases — separate mount
router.post("/projects/:id/apk-releases", requireAuth, async (req, res) => {
  const projectId = parseInt(req.params['id'] as string);
  const { version, buildNumber, releaseType, changelog, platform, minOsVersion, fileUrl, audience, apkScheduleId } = req.body;
  if (!version || !releaseType || !platform || !fileUrl || !audience) {
    res.status(400).json({ error: "version, releaseType, platform, fileUrl, audience required" });
    return;
  }
  const [release] = await db
    .insert(apkReleasesTable)
    .values({ projectId, uploaderId: req.user!.id, version, buildNumber: buildNumber ?? 1, releaseType, changelog: changelog ?? null, platform, minOsVersion: minOsVersion ?? null, fileUrl, audience, apkScheduleId: apkScheduleId ?? null })
    .returning();
  res.status(201).json(await formatRelease(release));
});

// GET /api/apk-releases/:id
router.get("/apk-releases/:id", requireAuth, async (req, res) => {
  const release = await db.query.apkReleasesTable.findFirst({ where: eq(apkReleasesTable.id, parseInt(req.params['id'] as string)) });
  if (!release) {
    res.status(404).json({ error: "APK release not found" });
    return;
  }
  res.json(await formatRelease(release));
});

export default router;
