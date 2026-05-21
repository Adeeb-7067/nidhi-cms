import type { Request, Response } from "express";
﻿import { apkReleasesTable, usersTable, getNextSequence } from "@/models/schema";
import { validateStoredFileUrl } from "@/lib/file-storage";

async function formatRelease(release: any) {
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
    createdAt: release.createdAt.toISOString(),
  };
}

// POST /api/projects/:id/apk-releases
export async function postProjectsByIdApkReleases(req: Request, res: Response) {
  const projectId = parseInt(req.params['id'] as string);
  const { version, buildNumber, releaseType, changelog, platform, minOsVersion, fileUrl, audience, apkScheduleId } = req.body;
  if (!version || !releaseType || !platform || !fileUrl || !audience) {
    res.status(400).json({ error: "version, releaseType, platform, fileUrl, audience required" });
    return;
  }

  try {
    validateStoredFileUrl(fileUrl, "fileUrl");
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid fileUrl" });
    return;
  }
  
  const nextId = await getNextSequence("apk_releases");
  const release = await apkReleasesTable.create({
    id: nextId,
    projectId,
    uploaderId: req.user!.id,
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


// GET /api/apk-releases/:id
export async function getApkReleasesById(req: Request, res: Response) {
  const release = await apkReleasesTable.findOne({ id: parseInt(req.params['id'] as string) });
  if (!release) {
    res.status(404).json({ error: "APK release not found" });
    return;
  }
  res.json(await formatRelease(release));
}

