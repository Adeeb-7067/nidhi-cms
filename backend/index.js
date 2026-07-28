import "./load-env.js";
import { createServer } from "node:http";
import app from "./src/app.js";
import { getRequiredPort } from "./src/config/index.js";
import { logger } from "./src/lib/logger.js";
import { initRealtime } from "./src/lib/realtime.js";
import { initFirebaseAdmin } from "./src/lib/firebase.js";
import { verifyMailer } from "./src/lib/email.js";
import { startInventoryExpiryJob } from "./src/modules/inventory/services/expiry-job.js";
import { startAlertSchedulerJob } from "./src/modules/alerts/services/alert-scheduler-job.js";
import { startDailyLogComplianceJob } from "./src/modules/work/services/daily-log-compliance.js";
import { startScreenshotPurgeJob } from "./src/modules/monitoring/services/screenshot-purge-job.js";
import { startReportPurgeJob } from "./src/modules/work/services/report-purge-job.js";
import { migrateDirectConversationIndexes } from "./src/modules/collab/services/direct-conversation-migration.js";
import {
  ensureDefaultRoleTemplates,
  backfillSystemTemplatePermissions,
  assignRoleTemplatesToUsers,
} from "./src/modules/identity/services/permissions.service.js";
import { seedLeaveTypes } from "./src/modules/hrm/services/leave.service.js";
import { startLeaveAccrualJob } from "./src/modules/hrm/services/leave-accrual.service.js";
import { startAttendanceMaterializeJob } from "./src/modules/hrm/services/attendance-materialize.service.js";
import { startEmployeeExitJob } from "./src/modules/hrm/services/employee-exit-job.js";
import { startProjectDocumentRenewalReminderJob } from "./src/modules/admin/services/renewal-reminder-job.js";
import { startChequeClearanceReminderJob } from "./src/modules/finance/services/cheque-clearance-reminder-job.js";
import { startStorageCleanupJob } from "./src/modules/finance/services/storage-cleanup-job.js";
import { startMarketingPostReminderJob } from "./src/modules/marketing/services/post-schedule-reminder-job.js";
import { startCaDueReminderJob } from "./src/modules/ca/services/due-reminder-job.js";
import { getStorageBackend, isObjectStorageEnabled } from "./src/lib/file-storage.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "./src/lib/db.js";

// A transient MongoDB blip (e.g. Atlas replica-set failover) can reject a query
// inside a background job that has no local .catch, which Node turns into a
// fatal unhandledRejection/uncaughtException and takes the whole API down.
// Mongoose auto-reconnects, so treat operational Mongo/network errors as
// recoverable and keep serving; fail fast only on genuine programming errors.
const isOperationalDbError = (err) => {
  const name = err && (err.name || err.constructor?.name);
  return typeof name === "string" && (name.startsWith("Mongo") || name === "PoolClearedError");
};
process.on("unhandledRejection", (reason) => {
  if (isOperationalDbError(reason)) {
    logger.warn({ err: reason }, "Unhandled DB rejection — process kept alive; mongoose will reconnect");
    return;
  }
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  if (isOperationalDbError(err)) {
    logger.warn({ err }, "Uncaught DB error — process kept alive; mongoose will reconnect");
    return;
  }
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

const port = getRequiredPort();
const server = createServer(app);
initRealtime(server);
initFirebaseAdmin(); 
void verifyMailer();
const runInventoryExpiryCheck = startInventoryExpiryJob();
const runAlertSchedulerTick = startAlertSchedulerJob();
const runScreenshotJobs = startScreenshotPurgeJob();
const runReportJobs = startReportPurgeJob();
startDailyLogComplianceJob();
const runLeaveAccrualTick = startLeaveAccrualJob();
const runAttendanceMaterializeTick = startAttendanceMaterializeJob();
const runEmployeeExitTick = startEmployeeExitJob();
const runProjectDocumentRenewalTick = startProjectDocumentRenewalReminderJob();
const runChequeClearanceTick = startChequeClearanceReminderJob();
const runStorageCleanupTick = startStorageCleanupJob();
const runMarketingPostReminderTick = startMarketingPostReminderJob();
const runCaDueReminderTick = startCaDueReminderJob();
let backgroundJobsBootstrapped = false;
const bootstrapBackgroundJobs = () => {
  if (backgroundJobsBootstrapped) return;
  backgroundJobsBootstrapped = true;
  runInventoryExpiryCheck();
  runScreenshotJobs.dailyTick();
  runScreenshotJobs.heartbeatTick();
  runReportJobs.dailyTick();
  runLeaveAccrualTick();
  runAttendanceMaterializeTick();
  runEmployeeExitTick();
  void runAlertSchedulerTick();
  void runProjectDocumentRenewalTick();
  void runChequeClearanceTick();
  runStorageCleanupTick();
  void runMarketingPostReminderTick();
  void runCaDueReminderTick();
  logger.info(
    "Background jobs started (inventory expiry, screenshot purge, report purge, daily log compliance, leave accrual, attendance materialize, employee exit automation, alert scheduler, project document renewals, cheque clearance, storage cleanup, marketing post reminders, CA due reminders)",
  );
};
void whenDatabaseReady()
  .then(() => migrateDirectConversationIndexes())
  .then(() => ensureDefaultRoleTemplates())
  .then(() => backfillSystemTemplatePermissions())
  .then(() => assignRoleTemplatesToUsers())
  .then(() => seedLeaveTypes())
  .then(bootstrapBackgroundJobs)
  .catch((err) => {
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
