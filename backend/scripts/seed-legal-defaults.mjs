/**
 * Seed Legal counsel + sample matters so empty portals aren't blank.
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/seed-legal-defaults.mjs
 */
import "../load-env.js";
import { whenDatabaseReady } from "../src/lib/db.js";
import { ensureDefaultRoleTemplates } from "../src/modules/identity/services/permissions.service.js";
import {
  getNextSequence,
  usersTable,
  legalCounselTable,
  legalEmployeeCasesTable,
  legalNdaRecordsTable,
  legalCourtCasesTable,
  legalComplianceItemsTable,
  legalExpensesTable,
} from "../src/models/schema/index.js";

async function seedIfEmpty(table, label, buildRows) {
  const count = await table.countDocuments({ isDeleted: false });
  if (count > 0) {
    console.log(`Skip ${label} — already has ${count} row(s)`);
    return;
  }
  const rows = await buildRows();
  if (!rows.length) return;
  await table.insertMany(rows);
  console.log(`Seeded ${rows.length} ${label}`);
}

async function main() {
  await whenDatabaseReady();
  console.log("Seeding Legal defaults…");
  await ensureDefaultRoleTemplates();

  const admin =
    (await usersTable.findOne({ role: "super_admin" }).lean()) ||
    (await usersTable.findOne({}).lean());
  if (!admin) throw new Error("No users found — create a super_admin first.");
  const actorId = admin.id;

  let counselRows = await legalCounselTable.find({ isDeleted: false }).lean();
  if (counselRows.length === 0) {
    const seeds = [
      { name: "Adv. Meera Joshi", email: "meera.j@satyakabir.com", role: "legal_head" },
      { name: "Adv. Arjun Patel", email: "arjun.p@satyakabir.com", role: "associate" },
      { name: "LexCorp Associates", email: "matters@lexcorp.in", role: "external_counsel" },
    ];
    const rows = [];
    for (const s of seeds) {
      const id = await getNextSequence("legal_counsel");
      rows.push({ id, ...s, createdBy: actorId, isDeleted: false });
    }
    await legalCounselTable.insertMany(rows);
    counselRows = rows;
    console.log(`Seeded ${rows.length} counsel`);
  } else {
    console.log(`Skip counsel — already has ${counselRows.length} row(s)`);
  }

  const c1 = { id: counselRows[0].id, name: counselRows[0].name, email: counselRows[0].email, role: counselRows[0].role };
  const c2 = counselRows[1]
    ? { id: counselRows[1].id, name: counselRows[1].name, email: counselRows[1].email, role: counselRows[1].role }
    : c1;

  await seedIfEmpty(legalEmployeeCasesTable, "employee cases", async () => {
    const id = await getNextSequence("legal_employee_cases");
    const ref = await getNextSequence("legal_employee_case_ref");
    const year = new Date().getFullYear();
    return [
      {
        id,
        caseNumber: `ELC-${year}-${String(ref).padStart(4, "0")}`,
        employeeName: "Sample Employee",
        department: "Engineering",
        type: "policy_violation",
        status: "under_review",
        risk: "medium",
        assignedTo: c1,
        openedAt: new Date(),
        summary: "Seeded sample case — replace with real matters.",
        nextHearing: new Date(Date.now() + 14 * 86400000),
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(legalNdaRecordsTable, "NDAs", async () => {
    const id = await getNextSequence("legal_nda_records");
    return [
      {
        id,
        partyName: "Sample Vendor Pvt Ltd",
        partyType: "vendor",
        status: "active",
        signedAt: new Date(Date.now() - 200 * 86400000),
        expiresAt: new Date(Date.now() + 20 * 86400000),
        risk: "medium",
        assignedTo: c2,
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(legalCourtCasesTable, "court cases", async () => {
    const id = await getNextSequence("legal_court_cases");
    const ref = await getNextSequence("legal_court_case_ref");
    const year = new Date().getFullYear();
    return [
      {
        id,
        caseNumber: `CC-${year}-${String(ref).padStart(4, "0")}`,
        court: "District Court",
        title: "Sample civil matter",
        status: "listed",
        risk: "low",
        nextHearing: new Date(Date.now() + 21 * 86400000),
        assignedTo: c1,
        openedAt: new Date(),
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(legalComplianceItemsTable, "compliance items", async () => {
    const id = await getNextSequence("legal_compliance_items");
    return [
      {
        id,
        framework: "POSH",
        requirement: "Annual awareness training completed",
        status: "compliant",
        risk: "low",
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 180 * 86400000),
        owner: c1,
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  await seedIfEmpty(legalExpensesTable, "expenses", async () => {
    const id = await getNextSequence("legal_expenses");
    return [
      {
        id,
        date: new Date(),
        category: "counsel_fees",
        description: "Retainer — seed sample",
        amount: 25000,
        matterRef: "SEED",
        approvedBy: c1.name,
        receiptAttached: false,
        createdBy: actorId,
        isDeleted: false,
      },
    ];
  });

  console.log("Legal seed done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
