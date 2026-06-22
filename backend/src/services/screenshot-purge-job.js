import path from "path";
import fs from "fs/promises";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { employeeScreenshotsTable } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";
import {
  closeSessionsExceedingMaxDuration,
  closeSessionsPastWorkDay,
  closeStaleHeartbeatSessions,
} from "./work-sessions.service.js";
import { isObjectStorageEnabled } from "../lib/object-storage.js";
import { logger } from "../lib/logger.js";
import { isDatabaseConnected } from "../lib/db.js";

const DAY_MS = 864e5;

// Max session wall-clock span — aligned with work-session-policy.js (24 h).
const STALE_SESSION_HOURS = 24;

// Active sessions with no heartbeat for this long are auto-closed (app crash/kill, app closed
// without graceful quit). Electron sends heartbeats every 60 s — 10 min ≈ 10 missed beats.
// Do NOT set too low: brief network/API outages must not end active work sessions.
const HEARTBEAT_STALE_MINUTES = 10;

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

// Safety net for crashed clients — same 24 h cap enforced in work-sessions.service.
async function runStaleSessionCleanup() {
  if (!isDatabaseConnected()) return;

  const { closed } = await closeSessionsExceedingMaxDuration();
  if (closed > 0) {
    logger.info(
      { count: closed, thresholdHours: STALE_SESSION_HOURS },
      "Stale session cleanup: closed sessions exceeding max duration",
    );
  }
}

async function runWorkDaySessionCleanup() {
  if (!isDatabaseConnected()) return;

  const { closed, todayKey } = await closeSessionsPastWorkDay();
  if (closed > 0) {
    logger.info({ count: closed, workDay: todayKey }, "Work-day session cleanup: closed prior-day sessions");
  }
}

async function runHeartbeatStaleSessionCleanup() {
  if (!isDatabaseConnected()) return;

  const cutoff = new Date(Date.now() - HEARTBEAT_STALE_MINUTES * 60 * 1000);
  const { closed } = await closeStaleHeartbeatSessions(cutoff);

  if (closed > 0) {
    logger.info(
      { count: closed, thresholdMinutes: HEARTBEAT_STALE_MINUTES },
      "Heartbeat stale session cleanup: closed disconnected sessions",
    );
  }
}

function startScreenshotPurgeJob() {
  const dailyIntervalMs = 24 * 60 * 60 * 1e3;
  const heartbeatIntervalMs = 2 * 60 * 1e3;

  const dailyTick = () => {
    runScreenshotPurge().catch((err) =>
      logger.error({ err }, "Screenshot purge job failed")
    );
    runStaleSessionCleanup().catch((err) =>
      logger.error({ err }, "Stale session cleanup job failed")
    );
  };

  const heartbeatTick = () => {
    runWorkDaySessionCleanup().catch((err) =>
      logger.error({ err }, "Work-day session cleanup job failed")
    );
    runStaleSessionCleanup().catch((err) =>
      logger.error({ err }, "Max-duration session cleanup job failed")
    );
    runHeartbeatStaleSessionCleanup().catch((err) =>
      logger.error({ err }, "Heartbeat stale session cleanup job failed")
    );
  };

  setInterval(dailyTick, dailyIntervalMs);
  setInterval(heartbeatTick, heartbeatIntervalMs);
  // Return daily tick so the caller (index.js) can run it immediately after DB is ready.
  return { dailyTick, heartbeatTick };
}

export { startScreenshotPurgeJob };
