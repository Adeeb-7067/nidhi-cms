/**
 * Seed CA Phase 1–2 sample records so empty portals aren't blank.
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/seed-ca-defaults.mjs
 */
import "../load-env.js";
import mongoose from "mongoose";
import { whenDatabaseReady } from "../src/lib/db.js";
import { ensureDefaultRoleTemplates } from "../src/modules/identity/services/permissions.service.js";
import {
  getNextSequence,
  usersTable,
  caTasksTable,
  caDocumentsTable,
  caCalendarEventsTable,
  caNoticesTable,
  caGstFilingsTable,
  caTdsReturnsTable,
  caTdsCertificatesTable,
  caCompanyItrTable,
  caDirectorItrTable,
  caRocFilingsTable,
  caDinDscTable,
  caAuditsTable,
  caSuspenseEntriesTable,
} from "../src/models/schema/index.js";

async function seedIfEmpty(table, label, buildRows) {
  const count = await table.countDocuments({ isDeleted: false });
  if (count > 0) {
    console.log(`Skip ${label} — already has ${count} row(s)`);
    return;
  }
  const rows = await buildRows();
  if (rows.length === 0) return;
  await table.insertMany(rows);
  console.log(`Seeded ${rows.length} ${label}`);
}

async function main() {
  await whenDatabaseReady();
  console.log("Seeding CA defaults…");
  await ensureDefaultRoleTemplates();

  const admin =
    (await usersTable.findOne({ role: "super_admin" }).lean()) ||
    (await usersTable.findOne({}).lean());
  if (!admin) throw new Error("No users found — create a super_admin first.");
  const actorId = admin.id;

  await seedIfEmpty(caTasksTable, "CA tasks", async () => {
    const id = await getNextSequence("ca_tasks");
    return [
      {
        id,
        title: "File GSTR-3B for current month",
        category: "GST",
        status: "pending",
        priority: "high",
        assignedByName: "CEO",
        assignedToName: "CA Team",
        dueDate: new Date(Date.now() + 7 * 86400000),
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caCalendarEventsTable, "calendar events", async () => {
    const id = await getNextSequence("ca_calendar_events");
    return [
      {
        id,
        title: "GSTR-3B due",
        category: "GST",
        dueDate: new Date(Date.now() + 10 * 86400000),
        status: "upcoming",
        ownerName: "CA Team",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caNoticesTable, "notices", async () => {
    const id = await getNextSequence("ca_notices");
    return [
      {
        id,
        department: "gst",
        reference: "GST-NOTICE-001",
        subject: "Sample GST notice (seed)",
        receivedAt: new Date(),
        dueDate: new Date(Date.now() + 14 * 86400000),
        workflowStatus: "received",
        assignedToName: "CA Team",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caGstFilingsTable, "GST filings", async () => {
    const id1 = await getNextSequence("ca_gst_filings");
    const id2 = await getNextSequence("ca_gst_filings");
    return [
      {
        id: id1,
        returnType: "GSTR-1",
        period: "Current month",
        dueDate: new Date(Date.now() + 5 * 86400000),
        status: "pending",
        createdBy: actorId,
        isDeleted: false,
      },
      {
        id: id2,
        returnType: "GSTR-3B",
        period: "Current month",
        dueDate: new Date(Date.now() + 12 * 86400000),
        status: "draft",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caTdsReturnsTable, "TDS returns", async () => {
    const id = await getNextSequence("ca_tds_returns");
    return [
      {
        id,
        returnType: "26Q",
        quarter: "Q4",
        dueDate: new Date(Date.now() + 20 * 86400000),
        status: "pending",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caTdsCertificatesTable, "TDS certificates", async () => {
    const id = await getNextSequence("ca_tds_certificates");
    return [
      {
        id,
        form: "16A",
        party: "Sample Vendor",
        pan: "ABCDE1234F",
        amount: 25000,
        issued: false,
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caCompanyItrTable, "company ITR", async () => {
    const id = await getNextSequence("ca_company_itr");
    return [
      {
        id,
        financialYear: "2025-26",
        revenue: 0,
        expenses: 0,
        profitBeforeTax: 0,
        taxLiability: 0,
        filingStatus: "draft",
        dueDate: new Date("2026-10-31"),
        documents: [
          { id: 1, name: "Audited financials", uploaded: false },
          { id: 2, name: "Tax computation", uploaded: false },
          { id: 3, name: "ITR acknowledgement", uploaded: false },
        ],
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caDirectorItrTable, "director ITR", async () => {
    const id = await getNextSequence("ca_director_itr");
    return [
      {
        id,
        directorName: "Director (seed)",
        pan: "AAAAA0000A",
        financialYear: "2025-26",
        filingStatus: "pending",
        dueDate: new Date("2026-07-31"),
        taxLiability: 0,
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caRocFilingsTable, "ROC filings", async () => {
    const id = await getNextSequence("ca_roc_filings");
    return [
      {
        id,
        form: "AOC-4",
        financialYear: "2025-26",
        dueDate: new Date("2026-10-30"),
        status: "pending",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caDinDscTable, "DIN/DSC", async () => {
    const id = await getNextSequence("ca_din_dsc");
    return [
      {
        id,
        directorName: "Director (seed)",
        din: "01234567",
        dscExpiry: new Date(Date.now() + 60 * 86400000),
        dscStatus: "upcoming",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caAuditsTable, "audits", async () => {
    const id = await getNextSequence("ca_audits");
    return [
      {
        id,
        type: "statutory",
        auditor: "Statutory auditor (seed)",
        financialYear: "2025-26",
        phase: "planning",
        observations: 0,
        status: "upcoming",
        firm: "Seed & Co",
        partner: "Partner",
        membershipNo: "000000",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caSuspenseEntriesTable, "suspense", async () => {
    const id = await getNextSequence("ca_suspense");
    return [
      {
        id,
        receivedAt: new Date(),
        amount: 10000,
        bankRef: "SEED-UPI-001",
        mode: "upi",
        remarks: "Unidentified credit (seed)",
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(caDocumentsTable, "documents", async () => {
    const id = await getNextSequence("ca_documents");
    return [
      {
        id,
        title: "Company PAN (seed)",
        category: "pan",
        version: "1.0",
        uploadedById: actorId,
        uploadedByName: admin.name ?? "Admin",
        uploadedAt: new Date(),
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  console.log("CA seed complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
