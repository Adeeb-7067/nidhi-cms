/**
 * Migrate vendors out of the shared `Clients` collection into their own
 * `Vendors` collection.
 *
 * Safe & idempotent:
 *  - Copies every `Clients` row with isVendor:true into `vendors`, PRESERVING
 *    the same numeric `id` so existing expense/payment `vendorId` links keep
 *    resolving without any remap.
 *  - Only removes the row from `Clients` if that id is NOT referenced anywhere
 *    as a client/company (invoices, income, payments, projects, sales). A
 *    dual-use row is kept in Clients with its isVendor flag cleared instead of
 *    being deleted — no client data is ever lost.
 *  - Seeds the `vendors` id sequence above all existing ids so new vendors
 *    never collide with migrated ones.
 *
 * Run:  node scripts/migrate-vendors-to-own-collection.mjs
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";

// Collections + fields that reference a Clients.id as a client/company.
const CLIENT_REFERENCES = [
  { coll: "financeinvoices", fields: ["clientId"] },
  { coll: "financeincomes", fields: ["clientId"] },
  { coll: "financepayments", fields: ["clientId"] },
  { coll: "projects", fields: ["clientId", "companyId"] },
  { coll: "salesinvoices", fields: ["customerId"] },
  { coll: "salespayments", fields: ["customerId"] },
  { coll: "salesproposals", fields: ["customerId"] },
  { coll: "salesinstallments", fields: ["customerId"] },
  { coll: "salesleads", fields: ["customerId", "clientId"] },
];

async function isReferencedAsClient(db, id) {
  for (const { coll, fields } of CLIENT_REFERENCES) {
    const or = fields.map((f) => ({ [f]: id }));
    const hit = await db.collection(coll).findOne({ $or: or }, { projection: { _id: 1 } });
    if (hit) return true;
  }
  return false;
}

function toVendorDoc(c) {
  return {
    id: c.id,
    companyName: c.companyName,
    contactPerson: c.contactPerson ?? null,
    email: c.email,
    phone: c.phone ?? null,
    address: c.address ?? null,
    website: c.website ?? null,
    gstNumber: c.gstNumber ?? null,
    vendorFields: Array.isArray(c.vendorFields) ? c.vendorFields : [],
    vendorNotes: c.vendorNotes ?? null,
    vendorCategory: c.vendorCategory ?? null,
    status: c.status === "inactive" ? "inactive" : "active",
    createdBy: c.createdBy ?? null,
    createdAt: c.createdAt ?? new Date(),
    updatedAt: c.updatedAt ?? new Date(),
  };
}

async function main() {
  await whenDatabaseReady();
  const db = mongoose.connection.db;
  const clientsColl = db.collection("clients");
  const vendorsColl = db.collection("vendors");
  const countersColl = db.collection("counters");

  const vendorRows = await clientsColl.find({ isVendor: true }).sort({ id: 1 }).toArray();

  if (!vendorRows.length) {
    console.log("No vendor rows (isVendor:true) found in Clients — nothing to migrate.");
  }

  let copied = 0;
  let deletedFromClients = 0;
  let keptAsDualUse = 0;
  let maxVendorId = 0;

  for (const c of vendorRows) {
    maxVendorId = Math.max(maxVendorId, c.id ?? 0);

    // 1. Copy into vendors (idempotent — won't overwrite an already-migrated row).
    const res = await vendorsColl.updateOne(
      { id: c.id },
      { $setOnInsert: toVendorDoc(c) },
      { upsert: true },
    );
    if (res.upsertedCount) copied += 1;

    // 2. Remove from Clients only if it's a pure vendor (not used as a client).
    const referenced = await isReferencedAsClient(db, c.id);
    if (referenced) {
      await clientsColl.updateOne({ id: c.id }, { $set: { isVendor: false } });
      keptAsDualUse += 1;
      console.warn(
        `Vendor #${c.id} (${c.companyName}) is also referenced as a client — kept in Clients (isVendor cleared), vendor copy created.`,
      );
    } else {
      await clientsColl.deleteOne({ id: c.id });
      deletedFromClients += 1;
    }
  }

  // 3. Seed the vendors id sequence above every existing id so new vendor
  //    ids can never collide with migrated ones (or with client ids).
  const clientsCounter = await countersColl.findOne({ _id: "clients" });
  const seedTo = Math.max(clientsCounter?.seq ?? 0, maxVendorId);
  await countersColl.updateOne({ _id: "vendors" }, { $max: { seq: seedTo } }, { upsert: true });

  const finalVendorCount = await vendorsColl.countDocuments({});
  const remainingVendorFlagged = await clientsColl.countDocuments({ isVendor: true });

  console.log("\n─── Vendor migration complete ───");
  console.log(`Vendor rows found in Clients : ${vendorRows.length}`);
  console.log(`Copied into vendors          : ${copied}`);
  console.log(`Deleted from Clients         : ${deletedFromClients}`);
  console.log(`Kept as dual-use (flag off)  : ${keptAsDualUse}`);
  console.log(`Total vendors now            : ${finalVendorCount}`);
  console.log(`vendors sequence seeded to   : ${seedTo}`);
  console.log(`Remaining isVendor:true rows : ${remainingVendorFlagged} (should be 0)`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
