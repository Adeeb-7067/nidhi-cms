import { reportsTable } from "../../../models/schema/index.js";
import { getOrCreateSettings } from "../../settings/services/company-settings.js";
import { deleteStoredFile } from "../../../lib/file-storage.js";
import { logger } from "../../../lib/logger.js";
import { isDatabaseConnected } from "../../../lib/db.js";

const DAY_MS = 864e5;

async function runReportPurge() {
  if (!isDatabaseConnected()) {
    logger.warn("Skipping report purge: database not connected");
    return;
  }

  const settings = await getOrCreateSettings();
  const retentionDays = settings.reportRetentionDays ?? 30;
  const cutoff = new Date(Date.now() - retentionDays * DAY_MS);

  // Process in batches to avoid loading all expired docs into memory at once.
  const BATCH_SIZE = 200;
  let purged = 0;

  while (true) {
    const batch = await reportsTable
      .find({ createdAt: { $lt: cutoff } })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (batch.length === 0) break;

    for (const doc of batch) {
      try {
        await deleteStoredFile(doc.fileUrl);
      } catch (err) {
        logger.error(
          { err, reportId: doc.id },
          "Report purge: failed to delete file, removing DB record anyway"
        );
      }
      await reportsTable.deleteOne({ id: doc.id });
      purged++;
    }
  }

  if (purged > 0) {
    logger.info({ purged, retentionDays }, "Report purge complete");
  }
}

function startReportPurgeJob() {
  const dailyIntervalMs = 24 * 60 * 60 * 1e3;

  const dailyTick = () => {
    runReportPurge().catch((err) => logger.error({ err }, "Report purge job failed"));
  };

  setInterval(dailyTick, dailyIntervalMs);
  // Return daily tick so the caller (index.js) can run it immediately after DB is ready.
  return { dailyTick };
}

export { startReportPurgeJob };
