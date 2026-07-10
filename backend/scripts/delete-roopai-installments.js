/**
 * Safely remove Roopai Agriforest (customer #21) project #25 installments #1 and #2,
 * plus linked sales invoice INV-2026-0004 (id 4) when unpaid.
 *
 * Usage: node --env-file=.env ./scripts/delete-roopai-installments.js --confirm
 */
import mongoose from "mongoose";
import { runInTx } from "../src/lib/db-tx.js";
import {
  SalesInstallments,
  SalesInvoices,
  SalesPayments,
  clientsTable,
} from "../src/models/schema/index.js";

const CUSTOMER_ID = 21;
const PROJECT_ID = 25;
const INSTALLMENT_IDS = [1, 2];

const confirmed = process.argv.includes("--confirm");
if (!confirmed) {
  console.error("Destructive action. Re-run with --confirm to proceed.");
  process.exit(1);
}

const uri = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (!uri) throw new Error("DATABASE_URL is not defined");

await mongoose.connect(uri);

const client = await clientsTable.findOne({ id: CUSTOMER_ID }).select({ companyName: 1 }).lean();
if (!client) throw new Error(`Customer #${CUSTOMER_ID} not found`);

const installments = await SalesInstallments.find({
  id: { $in: INSTALLMENT_IDS },
  customerId: CUSTOMER_ID,
  projectId: PROJECT_ID,
}).lean();

if (installments.length !== INSTALLMENT_IDS.length) {
  throw new Error(
    `Expected ${INSTALLMENT_IDS.length} installments, found ${installments.length}. Aborting.`,
  );
}

for (const inst of installments) {
  if ((inst.paidAmount ?? 0) > 0) {
    throw new Error(`Installment #${inst.id} has paid amount — aborting.`);
  }
}

const invoiceIds = [...new Set(installments.map((i) => i.invoiceId).filter(Boolean))];
const invoices = invoiceIds.length
  ? await SalesInvoices.find({ id: { $in: invoiceIds } }).lean()
  : [];

for (const inv of invoices) {
  if ((inv.paidAmount ?? 0) > 0) {
    throw new Error(`Invoice ${inv.number} has payments — aborting.`);
  }
}

const payments = await SalesPayments.find({
  $or: [
    { installmentId: { $in: INSTALLMENT_IDS } },
    ...(invoiceIds.length ? [{ invoiceId: { $in: invoiceIds } }] : []),
  ],
}).lean();
if (payments.length > 0) {
  throw new Error(`Found ${payments.length} payment(s) linked — aborting.`);
}

console.log(`Customer: ${client.companyName} (#${CUSTOMER_ID})`);
console.log("Will delete:");
for (const inst of installments) {
  console.log(`  - Installment #${inst.id}: ${inst.name} (₹${inst.dueAmount})`);
}
for (const inv of invoices) {
  console.log(`  - Invoice #${inv.id}: ${inv.number} (₹${inv.amount})`);
}

await runInTx(async (session) => {
  if (invoiceIds.length) {
    const invResult = await SalesInvoices.deleteMany({ id: { $in: invoiceIds } }, { session });
    console.log(`Deleted ${invResult.deletedCount} invoice(s).`);
  }
  const instResult = await SalesInstallments.deleteMany(
    { id: { $in: INSTALLMENT_IDS }, customerId: CUSTOMER_ID, projectId: PROJECT_ID },
    { session },
  );
  console.log(`Deleted ${instResult.deletedCount} installment(s).`);
});

const remaining = await SalesInstallments.find({ customerId: CUSTOMER_ID, projectId: PROJECT_ID }).lean();
console.log(`Remaining installments for project #${PROJECT_ID}: ${remaining.length}`);

await mongoose.disconnect();
console.log("Done.");
