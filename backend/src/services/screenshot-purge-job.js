import { employeeScreenshotsTable } from "../models/schema/index.js";
import { getOrCreateSettings } from "./company-settings.js";
import {
  closeSessionsExceedingMaxDuration,
  closeSessionsPastWorkDay,
  closeStaleHeartbeatSessions,
} from "./work-sessions.service.js";
import { closeSessionsPastShiftEnd } from "./shift-end-clockout.service.js";
import { deleteStoredFile } from "../lib/file-storage.js";
import { logger } from "../lib/logger.js";
import { isDatabaseConnected } from "../lib/db.js";

const DAY_MS = 864e5;

// Max session wall-clock span — aligned with work-session-policy.js (24 h).
const STALE_SESSION_HOURS = 24;

// Stale-heartbeat auto-close is disabled (see closeStaleHeartbeatSessions).
// Auto-pause is only: shift end, PC sleep, app/window shutdown (+ day boundary).
const HEARTBEAT_STALE_MINUTES = 90;

const SERVER_STARTED_AT = Date.now();

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

async function runShiftEndSessionCleanup() {
  if (!isDatabaseConnected()) return;

  const { closed, workDay } = await closeSessionsPastShiftEnd();
  if (closed > 0) {
    logger.info({ count: closed, workDay }, "Shift-end session cleanup: closed sessions past shift end");
  }
}

async function runHeartbeatStaleSessionCleanup() {
  if (!isDatabaseConnected()) return;

  // No-op by policy — kept so operators can see the job still runs.
  const staleMs = HEARTBEAT_STALE_MINUTES * 60 * 1000;
  const normalCutoff = Date.now() - staleMs;
  const startupCutoff = SERVER_STARTED_AT - staleMs;
  const cutoff = new Date(Math.min(normalCutoff, startupCutoff));
  const { closed, disabled } = await closeStaleHeartbeatSessions(cutoff);

  if (disabled) {
    logger.debug(
      { thresholdMinutes: HEARTBEAT_STALE_MINUTES },
      "Heartbeat stale session cleanup skipped (auto-pause limited to shift/sleep/shutdown)",
    );
    return;
  }

  if (closed > 0) {
    logger.info(
      { count: closed, thresholdMinutes: HEARTBEAT_STALE_MINUTES },
      "Heartbeat stale session cleanup: closed disconnected sessions",
    );
  }
}

function startScreenshotPurgeJob() {
  const dailyIntervalMs = 24 * 60 * 60 * 1e3;
  // Day-boundary / max-duration / stale checks — less urgent.
  const sessionPolicyIntervalMs = 60 * 1e3;
  // Shift-end must feel on-time: was 2 minutes (employees saw late clock-out + late push).
  const shiftEndIntervalMs = 15 * 1e3;

  const dailyTick = () => {
    runScreenshotPurge().catch((err) =>
      logger.error({ err }, "Screenshot purge job failed")
    );
    runStaleSessionCleanup().catch((err) =>
      logger.error({ err }, "Stale session cleanup job failed")
    );
  };

  const sessionPolicyTick = () => {
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

  const shiftEndTick = () => {
    runShiftEndSessionCleanup().catch((err) =>
      logger.error({ err }, "Shift-end session cleanup job failed")
    );
  };

  setInterval(dailyTick, dailyIntervalMs);
  setInterval(sessionPolicyTick, sessionPolicyIntervalMs);
  setInterval(shiftEndTick, shiftEndIntervalMs);

  // Keep heartbeatTick alias so index.js startup call still runs everything once.
  const heartbeatTick = () => {
    sessionPolicyTick();
    shiftEndTick();
  };

  return { dailyTick, heartbeatTick, shiftEndTick };
}

export { startScreenshotPurgeJob };
