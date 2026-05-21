/**
 * Idempotent migration: backfill companyId from clientId on projects and related collections.
 * Run: pnpm --filter @workspace/scripts run migrate-company
 */
import mongoose from "mongoose";
import * as schema from "@workspace/db/schema";

async function backfillFromProjects(
  collection: mongoose.Model<unknown>,
  projectField = "projectId",
) {
  const projects = await schema.projectsTable.find({}).select("id clientId companyId").lean();
  const projectMap = new Map((projects as any[]).map((p: any) => [
    p.id,
    p.companyId ?? p.clientId,
  ]));

  let updated = 0;
  const cursor = collection.find({
    [projectField]: { $exists: true, $ne: null },
    $or: [{ companyId: { $exists: false } }, { companyId: null }],
  }).cursor();

  for await (const doc of cursor) {
    const pid = (doc as any)[projectField];
    const companyId = projectMap.get(pid);
    if (companyId == null) continue;
    await collection.updateOne({ _id: (doc as any)._id }, { $set: { companyId } });
    updated++;
  }
  return updated;
}

async function normalizeCompanies() {
  const clients = await schema.clientsTable.find({}).lean();
  let updated = 0;
  for (const c of clients) {
    const patch: Record<string, unknown> = {};
    if (!c.primaryContact && c.contactPerson) patch.primaryContact = c.contactPerson;
    if (!c.logo && c.logoUrl) patch.logo = c.logoUrl;
    if (!c.companyCode && c.companyName) {
      const code = String(c.companyName)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 6)
        .toUpperCase();
      patch.companyCode = `${code}${c.id}`;
    }
    const legacyBusinessId = (c as { businessId?: string | null }).businessId;
    if (!c.gstNumber && legacyBusinessId) {
      patch.gstNumber = legacyBusinessId;
    }
    if (Object.keys(patch).length) {
      await schema.clientsTable.updateOne({ id: c.id }, { $set: patch });
      updated++;
    }
  }
  return updated;
}

async function backfillProjects() {
  const result = await schema.projectsTable.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    [{ $set: { companyId: "$clientId" } }],
  );
  return result.modifiedCount ?? 0;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Company hierarchy migration starting...");

  const companiesNormalized = await normalizeCompanies();
  console.log(`Normalized ${companiesNormalized} company records`);

  const projectsUpdated = await backfillProjects();
  console.log(`Backfilled companyId on ${projectsUpdated} projects`);

  const tables = [
    { name: "tickets", model: schema.ticketsTable },
    { name: "bugs", model: schema.bugsTable },
    { name: "daily_logs", model: schema.dailyLogsTable },
    { name: "apk_releases", model: schema.apkReleasesTable },
    { name: "reports", model: schema.reportsTable },
    { name: "resource_requests", model: schema.resourceRequestsTable },
    { name: "notifications", model: schema.notificationsTable },
    { name: "comments", model: schema.commentsTable },
  ];

  for (const { name, model } of tables) {
    const n = await backfillFromProjects(model as mongoose.Model<unknown>);
    console.log(`Backfilled companyId on ${n} ${name} documents`);
  }

  console.log("Migration complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
