import path from "path";
import fs from "fs/promises";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { employeeScreenshotsTable, workSessionsTable } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";
import { isObjectStorageEnabled } from "../lib/object-storage.js";
import { logger } from "../lib/logger.js";
import { isDatabaseConnected } from "../lib/db.js";

const DAY_MS = 864e5;

// Sessions open longer than this are treated as abandoned (crash / Task Manager kill / OS shutdown).
// Must be longer than any realistic workday; 24 h is a safe upper bound.
const STALE_SESSION_HOURS = 24;

// Single S3 client shared across the purge run — avoid per-file client construction.
let _s3Client = null;
function getS3Client() {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.LINODE_OBJECT_STORAGE_REGION || "sgp1",
      endpoint: process.env.LINODE_OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.LINODE_OBJECT_STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3Client;
}

async function deleteStoredFile(fileUrl) {
  if (!fileUrl) return;
  if (/^https?:\/\//i.test(fileUrl)) {
    if (!isObjectStorageEnabled()) return;
    const key = new URL(fileUrl).pathname.slice(1);
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: process.env.LINODE_OBJECT_BUCKET, Key: key })
    );
  } else if (fileUrl.startsWith("/uploads/")) {
    // Preserve the full subpath after /uploads/ — path.basename would strip subdirectories.
    const relPath = fileUrl.slice("/uploads/".length);
    const filePath = path.join(process.cwd(), "uploads", relPath);
    await fs.unlink(filePath);
  }
}

async function runScreenshotPurge() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping screenshot purge: database not connected");
    return;
  }

  const settings = await getOrCreateSettings();
  const retentionDays = settings.screenshotRetentionDays ?? 30;
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

  // Process in batches to avoid loading all expired docs into memory at once.
  const BATCH_SIZE = 200;
  let purged = 0;

  while (true) {
    const batch = await employeeScreenshotsTable
      .find({ takenAt: { $lt: cutoff } })
      .sort({ takenAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    for (const doc of batch) {
      try {
        await deleteStoredFile(doc.fileUrl);
      } catch (err) {
        logger.error(
          { err, screenshotId: doc.id },
          "Screenshot purge: failed to delete file, removing DB record anyway"
        );
      }
      await employeeScreenshotsTable.deleteOne({ id: doc.id });
      purged++;
    }
  }

  if (purged > 0) {
    logger.info({ purged, retentionDays }, "Screenshot purge complete");
  }
}

// Close any work sessions that have been open for longer than STALE_SESSION_HOURS.
// These are sessions whose process was killed (Task Manager, OS shutdown, app crash)
// before the graceful-quit clock-out could fire.
async function runStaleSessionCleanup() {
  if (!isDatabaseConnected()) return;

  const cutoff = new Date(Date.now() - STALE_SESSION_HOURS * 60 * 60 * 1000);
  const result = await workSessionsTable.updateMany(
    { isActive: true, startedAt: { $lt: cutoff } },
    { $set: { isActive: false, endedAt: cutoff, stopReason: "session_expired" } }
  );

  if (result.modifiedCount > 0) {
    logger.info(
      { count: result.modifiedCount, thresholdHours: STALE_SESSION_HOURS },
      "Stale session cleanup: closed abandoned sessions"
    );
  }
}

function startScreenshotPurgeJob() {
  const intervalMs = 24 * 60 * 60 * 1e3;

  const tick = () => {
    runScreenshotPurge().catch((err) =>
      logger.error({ err }, "Screenshot purge job failed")
    );
    runStaleSessionCleanup().catch((err) =>
      logger.error({ err }, "Stale session cleanup job failed")
    );
  };

  setInterval(tick, intervalMs);
  // Return tick so the caller (index.js) can run it immediately after DB is ready.
  return tick;
}

export { startScreenshotPurgeJob };
