import { employeeScreenshotsTable, workSessionsTable, getNextSequence } from "../../../models/schema/index.js";
import { storeUpload, deleteStoredFile } from "../../../lib/file-storage.js";
import { badRequest, notFound, forbidden } from "../../../utils/route-errors.js";
import { logger } from "../../../lib/logger.js";
import { userHasPermission } from "../../identity/services/permissions.service.js";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]; // \x89PNG
const JPEG_MAGIC = [0xff, 0xd8, 0xff];       // SOI marker

export async function canMonitorScreenshots(user) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return userHasPermission(user.id, "monitor_screenshots", "view");
}

function validateImageMagicBytes(buffer) {
  if (buffer.length < 8) badRequest("Invalid image file.", "file");
  const isPng = PNG_MAGIC.every((b, i) => buffer[i] === b);
  const isJpeg = JPEG_MAGIC.every((b, i) => buffer[i] === b);
  if (!isPng && !isJpeg) badRequest("Screenshot must be a PNG or JPEG image.", "file");
}

export async function uploadScreenshot({ buffer, originalName, mimetype, userId, projectId, sessionId }) {
  validateImageMagicBytes(buffer);

  if (sessionId != null) {
    const session = await workSessionsTable.findOne({ id: sessionId, userId }).lean();
    if (!session) badRequest("Session not found or does not belong to you.", "sessionId");
  }

  const { url } = await storeUpload(buffer, originalName, mimetype, "screenshots");
  const id = await getNextSequence("employeeScreenshot");
  const doc = await employeeScreenshotsTable.create({
    id,
    userId,
    sessionId: sessionId ?? null,
    projectId: projectId ?? null,
    fileUrl: url,
    fileSize: buffer.length,
    takenAt: new Date()
  });
  return doc;
}

export async function listScreenshots({ userId, projectId, startDate, endDate, page, limit, skip, requestingUser }) {
  const isAdmin = await canMonitorScreenshots(requestingUser);

  if (!isAdmin) {
    userId = requestingUser.id;
  } else if (!userId) {
    userId = null;
  }

  if (!isAdmin && userId && userId !== requestingUser.id) {
    forbidden("You can only view your own screenshots.");
  }

  const filter = {};
  if (userId) filter.userId = userId;
  if (projectId) filter.projectId = projectId;
  if (startDate || endDate) {
    filter.takenAt = {};
    if (startDate) filter.takenAt.$gte = new Date(startDate);
    if (endDate) filter.takenAt.$lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    employeeScreenshotsTable.find(filter).sort({ takenAt: 1 }).skip(skip).limit(limit).lean(),
    employeeScreenshotsTable.countDocuments(filter)
  ]);

  return { items, total, page, limit };
}

export async function deleteScreenshot(id, requestingUser) {
  if (!(await canMonitorScreenshots(requestingUser))) {
    forbidden("Only monitoring admins can delete screenshots.");
  }

  const doc = await employeeScreenshotsTable.findOne({ id });
  if (!doc) notFound("Screenshot");

  try {
    await deleteStoredFile(doc.fileUrl);
  } catch (err) {
    logger.error({ err, screenshotId: id }, "Screenshot delete: failed to remove file, removing DB record anyway");
  }
  await employeeScreenshotsTable.deleteOne({ id });
}

export async function bulkDeleteScreenshots(ids, requestingUser) {
  if (!Array.isArray(ids) || ids.length === 0) {
    badRequest("ids must be a non-empty array.", "ids");
  }

  if (!(await canMonitorScreenshots(requestingUser))) {
    forbidden("Only monitoring admins can delete screenshots.");
  }

  const docs = await employeeScreenshotsTable.find({ id: { $in: ids } }, { id: 1, fileUrl: 1 }).lean();
  for (const doc of docs) {
    try {
      await deleteStoredFile(doc.fileUrl);
    } catch (err) {
      logger.error({ err, screenshotId: doc.id }, "Bulk screenshot delete: failed to remove file, removing DB record anyway");
    }
  }

  const result = await employeeScreenshotsTable.deleteMany({ id: { $in: ids } });
  return { deleted: result.deletedCount };
}
