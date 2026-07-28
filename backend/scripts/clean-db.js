/**
 * Wipe all application data except super_admin users.
 * Usage: node --env-file=.env ./scripts/clean-db.js --confirm
 */
import mongoose from "mongoose";
import { Counter } from "../src/modules/platform/schema/counter.js";
import {
  usersTable,
  credentialHistoryTable,
  sessionsTable,
  passwordResetTokensTable,
  clientsTable,
  projectsTable,
  projectMembersTable,
  apkSchedulesTable,
  milestonesTable,
  dailyLogsTable,
  bugsTable,
  tasksTable,
  apkReleasesTable,
  apkDownloadLogsTable,
  commentsTable,
  notificationsTable,
  resourceRequestsTable,
  reportsTable,
  companySettingsTable,
  auditLogsTable,
  ticketsTable,
  inventoryActivitiesTable,
  inventoryCredentialAccessLogsTable,
  inventoryCredentialsTable,
  inventoryDevicesTable,
  inventoryEnvironmentsTable,
  inventoryFoldersTable,
  inventoryResourcesTable,
  inventorySubscriptionsTable,
} from "../src/models/schema/index.js";

const confirmed = process.argv.includes("--confirm");
if (!confirmed) {
  console.error("Destructive action. Re-run with --confirm to proceed.");
  process.exit(1);
}

async function wipe(label, model, filter = {}) {
  const result = await model.deleteMany(filter);
  console.log(`  ${label}: deleted ${result.deletedCount}`);
  return result.deletedCount;
}

async function main() {
  const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("DATABASE_URL is not defined");
  }

  console.log("Connecting to database...");
  await mongoose.connect(uri);

  const admins = await usersTable.find({ role: "super_admin" }).lean();
  if (admins.length === 0) {
    throw new Error("No super_admin user found — aborting to avoid locking you out.");
  }

  console.log(`Keeping ${admins.length} super_admin user(s):`);
  for (const admin of admins) {
    console.log(`  - ${admin.email} (${admin.name})`);
  }

  console.log("\nDeleting data...");
  await wipe("Users (non-admin)", usersTable, { role: { $ne: "super_admin" } });
  await wipe("Credential history", credentialHistoryTable);
  await wipe("Sessions", sessionsTable);
  await wipe("Password reset tokens", passwordResetTokensTable);
  await wipe("Clients / companies", clientsTable);
  await wipe("Projects", projectsTable);
  await wipe("Project members", projectMembersTable);
  await wipe("APK schedules", apkSchedulesTable);
  await wipe("Milestones", milestonesTable);
  await wipe("Daily logs", dailyLogsTable);
  await wipe("Bugs", bugsTable);
  await wipe("Tasks", tasksTable);
  await wipe("APK releases", apkReleasesTable);
  await wipe("APK download logs", apkDownloadLogsTable);
  await wipe("Comments", commentsTable);
  await wipe("Notifications", notificationsTable);
  await wipe("Resource requests", resourceRequestsTable);
  await wipe("Reports", reportsTable);
  await wipe("Company settings", companySettingsTable);
  await wipe("Audit logs", auditLogsTable);
  await wipe("Tickets", ticketsTable);
  await wipe("Inventory folders", inventoryFoldersTable);
  await wipe("Inventory resources", inventoryResourcesTable);
  await wipe("Inventory credentials", inventoryCredentialsTable);
  await wipe("Inventory credential access logs", inventoryCredentialAccessLogsTable);
  await wipe("Inventory environments", inventoryEnvironmentsTable);
  await wipe("Inventory devices", inventoryDevicesTable);
  await wipe("Inventory subscriptions", inventorySubscriptionsTable);
  await wipe("Inventory activities", inventoryActivitiesTable);
  await wipe("ID counters", Counter);

  const maxUserId = Math.max(...admins.map((a) => a.id), 0);
  if (maxUserId > 0) {
    await Counter.findByIdAndUpdate("users", { seq: maxUserId }, { upsert: true });
    console.log(`  Reset users counter to ${maxUserId}`);
  }

  console.log("\nDatabase cleaned. Only super_admin user(s) remain.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
