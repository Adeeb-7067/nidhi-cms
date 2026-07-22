import path from "node:path";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { GetObjectCommand, getS3Client } from "../lib/object-storage.js";
import * as screenshotsService from "../services/screenshots.service.js";
import { badRequest, notFound, forbidden, parseIdParam, parsePagination } from "../utils/route-errors.js";
import { employeeScreenshotsTable } from "../models/schema/index.js";

export async function create(req, res) {
  if (!req.file) badRequest("Screenshot file is required.", "file");

  const userId = req.user.id;
  const projectId = req.body.projectId ? Number(req.body.projectId) : undefined;
  const sessionId = req.body.sessionId ? Number(req.body.sessionId) : undefined;

  const doc = await screenshotsService.uploadScreenshot({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    userId,
    projectId,
    sessionId,
  });

  res.status(201).json(formatScreenshot(doc, req));
}

export async function list(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const isAdmin = await screenshotsService.canMonitorScreenshots(req.user);
  const userId = req.query.userId
    ? Number(req.query.userId)
    : isAdmin ? undefined : req.user.id;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

  const startDate = req.query.startDate || undefined;
  const endDate = req.query.endDate || undefined;

  const result = await screenshotsService.listScreenshots({
    userId,
    projectId,
    startDate,
    endDate,
    page,
    limit,
    skip,
    requestingUser: req.user
  });

  res.json({
    data: result.items.map((s) => formatScreenshot(s, req)),
    total: result.total,
    page: result.page,
    limit: result.limit
  });
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  await screenshotsService.deleteScreenshot(id, req.user);
  res.status(204).end();
}

export async function bulkDelete(req, res) {
  const { ids } = req.body;
  const result = await screenshotsService.bulkDeleteScreenshots(ids, req.user);
  res.json(result);
}

// Authenticated streaming proxy for screenshot files.
// Token is embedded in the URL at response time so <img src> tags work without
// needing a custom Authorization header.
export async function serveContent(req, res) {
  const id = parseIdParam(req.params.id, "id");
  const doc = await employeeScreenshotsTable.findOne({ id }).lean();
  if (!doc) notFound("Screenshot");

  const isAdmin = await screenshotsService.canMonitorScreenshots(req.user);
  if (!isAdmin && doc.userId !== req.user.id) {
    forbidden("You can only view your own screenshots.");
  }

  const { fileUrl } = doc;

  // Allow cross-origin reads so <img src> tags on the frontend (different port
  // in dev, different subdomain in prod) can display the image. helmet sets
  // Cross-Origin-Resource-Policy: same-origin globally; we override it here
  // because this endpoint is already protected by auth + token validation.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (/^https?:\/\//i.test(fileUrl)) {
    const bucket = process.env.LINODE_OBJECT_BUCKET;
    if (!bucket) notFound("Screenshot file (storage not configured)");
    // Key is the URL path after the leading slash: /bucket/prefix/file → prefix/file
    const key = new URL(fileUrl).pathname.slice(1);
    try {
      const result = await getS3Client().send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      res.setHeader("Content-Type", result.ContentType || "image/png");
      res.setHeader("Cache-Control", "private, max-age=3600");
      result.Body.pipe(res);
    } catch (err) {
      if (err.name === "NoSuchKey") notFound("Screenshot file");
      throw err;
    }
  } else if (fileUrl.startsWith("/uploads/")) {
    const relPath = fileUrl.slice("/uploads/".length);
    const filePath = path.join(process.cwd(), "uploads", relPath);
    try {
      await access(filePath);
    } catch {
      notFound("Screenshot file");
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "private, max-age=3600");
    createReadStream(filePath).pipe(res);
  } else {
    notFound("Screenshot file");
  }
}

// Build a proxy URL with the bearer token embedded so <img src> tags can load it.
// The token is the one the requester used for this API call — already authenticated.
function formatScreenshot(doc, req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const fileUrl = token
    ? `${baseUrl}/api/screenshots/${doc.id}/content?token=${encodeURIComponent(token)}`
    : null;

  return {
    id: doc.id,
    userId: doc.userId,
    sessionId: doc.sessionId ?? null,
    projectId: doc.projectId ?? null,
    fileUrl,
    fileSize: doc.fileSize ?? null,
    takenAt: doc.takenAt,
  };
}
