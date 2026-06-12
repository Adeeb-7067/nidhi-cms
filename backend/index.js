import "./load-env.js";
import { createServer } from "node:http";
import app from "./src/app.js";
import { getRequiredPort } from "./src/config/index.js";
import { logger } from "./src/lib/logger.js";
import { initRealtime } from "./src/lib/realtime.js";
import { initFirebaseAdmin } from "./src/lib/firebase.js";
import { verifyMailer } from "./src/lib/email.js";
import { startInventoryExpiryJob } from "./src/services/inventory/expiry-job.js";
import { startDailyLogComplianceJob } from "./src/services/daily-log-compliance.js";
import { startScreenshotPurgeJob } from "./src/services/screenshot-purge-job.js";
import { getStorageBackend, isObjectStorageEnabled } from "./src/lib/file-storage.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "./src/lib/db.js";
const port = getRequiredPort();
const server = createServer(app);
initRealtime(server);
initFirebaseAdmin();
void verifyMailer();
const runInventoryExpiryCheck = startInventoryExpiryJob();
const runScreenshotPurge = startScreenshotPurgeJob();
startDailyLogComplianceJob();
let backgroundJobsBootstrapped = false;
const bootstrapBackgroundJobs = () => {
  if (backgroundJobsBootstrapped) return;
  backgroundJobsBootstrapped = true;
  runInventoryExpiryCheck();
  runScreenshotPurge();
  // Daily log compliance only runs on the 5-minute interval (respects reminder hour/timezone).
  logger.info("Background jobs started (inventory expiry, screenshot purge, daily log compliance)");
};
void whenDatabaseReady().then(bootstrapBackgroundJobs).catch((err) => {
  logger.warn(
    { err },
    "Background jobs deferred: database unavailable (check DATABASE_URL / network)"
  );
});
mongoose.connection.on("connected", bootstrapBackgroundJobs);
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port },
      `Port ${port} is already in use. Stop the other API process (or close the terminal running it), then start again.`
    );
    process.exit(1);
  }
  throw err;
});
server.listen(port, () => {
  logger.info(
    {
      port,
      fileStorage: getStorageBackend(),
      bucket: isObjectStorageEnabled() ? process.env.LINODE_OBJECT_BUCKET : void 0
    },
    "Server listening with Realtime enabled"
  );
});
