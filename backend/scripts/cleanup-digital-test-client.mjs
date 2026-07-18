/**
 * Remove Digital Flow test client seed data (and all linked marketing rows).
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/cleanup-digital-test-client.mjs
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import {
  clientsTable,
  projectsTable,
  marketingAccountsTable,
  marketingTasksTable,
  marketingMediaItemsTable,
  marketingPostsTable,
  marketingApprovalsTable,
  marketingActivityTable,
  marketingGraphicsTable,
  marketingVideosTable,
  marketingContentTable,
  marketingCampaignsTable,
  marketingSocialMetricsTable,
  marketingSeoKeywordsTable,
  marketingSeoAuditsTable,
  marketingReportsTable,
} from "../src/models/schema/index.js";

const TEST_EMAIL = "digital.flow.test@cms.local";
const TEST_COMPANY = "Digital Flow Test Co";
const TEST_CODE = "DFTTEST";

async function deleteMany(label, model, filter) {
  const res = await model.deleteMany(filter);
  const n = res.deletedCount ?? 0;
  if (n) console.log(`  ${label}: deleted ${n}`);
  return n;
}

async function main() {
  await whenDatabaseReady();
  console.log("Cleaning Digital Flow test data…");

  const company = await clientsTable
    .findOne({
      $or: [{ email: TEST_EMAIL }, { companyCode: TEST_CODE }, { companyName: TEST_COMPANY }],
    })
    .lean();

  if (!company) {
    console.log("No Digital Flow Test Co company found — nothing to clean for that seed.");
  } else {
    console.log(`Found company id=${company.id} — ${company.companyName}`);

    const accounts = await marketingAccountsTable
      .find({ companyId: company.id })
      .select({ id: 1 })
      .lean();
    const accountIds = accounts.map((a) => a.id);
    console.log(`Digital accounts: ${accountIds.length ? accountIds.join(", ") : "(none)"}`);

    const byAccount = accountIds.length ? { accountId: { $in: accountIds } } : null;
    const byCompany = { companyId: company.id };

    if (byAccount) {
      await deleteMany("tasks", marketingTasksTable, byAccount);
      await deleteMany("media", marketingMediaItemsTable, byAccount);
      await deleteMany("posts", marketingPostsTable, byAccount);
      await deleteMany("approvals", marketingApprovalsTable, byAccount);
      await deleteMany("activity", marketingActivityTable, byAccount);
      await deleteMany("graphics", marketingGraphicsTable, byAccount);
      await deleteMany("videos", marketingVideosTable, byAccount);
      await deleteMany("content", marketingContentTable, byAccount);
      await deleteMany("campaigns", marketingCampaignsTable, byAccount);
      await deleteMany("social metrics", marketingSocialMetricsTable, byAccount);
      await deleteMany("seo keywords", marketingSeoKeywordsTable, byAccount);
      await deleteMany("seo audits", marketingSeoAuditsTable, byAccount);
      await deleteMany("reports", marketingReportsTable, byAccount);
    }

    // Catch any rows keyed only by companyId
    await deleteMany("activity (company)", marketingActivityTable, byCompany);
    await deleteMany("reports (company)", marketingReportsTable, byCompany);
    await deleteMany("accounts", marketingAccountsTable, { companyId: company.id });

    const projects = await projectsTable.deleteMany({
      $or: [
        { clientId: company.id, type: "digital" },
        { companyId: company.id, type: "digital" },
        { name: /Digital Flow/i },
      ],
    });
    console.log(`  digital projects: deleted ${projects.deletedCount ?? 0}`);

    await clientsTable.deleteOne({ id: company.id });
    console.log(`  company: deleted id=${company.id}`);
  }

  console.log("\n✅ Digital test seed cleanup done");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
