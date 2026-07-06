/**
 * One-off: reassign invoice + payments to the correct customer.
 * Usage: node --env-file=.env ./scripts/reassign-invoice-customer.mjs <invoiceId> <newCustomerId>
 */
import mongoose from "mongoose";
import { SalesInvoices, SalesPayments, clientsTable, projectsTable } from "../src/models/schema/index.js";

const invoiceId = Number(process.argv[2]);
const newCustomerId = Number(process.argv[3]);

if (!invoiceId || !newCustomerId) {
  console.error("Usage: reassign-invoice-customer.mjs <invoiceId> <newCustomerId>");
  process.exit(1);
}

await mongoose.connect(process.env.DATABASE_URL);

const invoice = await SalesInvoices.findOne({ id: invoiceId }).lean();
if (!invoice) {
  console.error("Invoice not found:", invoiceId);
  process.exit(1);
}

const client = await clientsTable.findOne({ id: newCustomerId }).lean();
if (!client) {
  console.error("Customer not found:", newCustomerId);
  process.exit(1);
}

if (invoice.projectId) {
  const project = await projectsTable.findOne({ id: invoice.projectId }).lean();
  const projectClientId = project?.clientId ?? project?.companyId ?? null;
  if (projectClientId && projectClientId !== newCustomerId) {
    console.error(
      `Project ${invoice.projectId} belongs to customer ${projectClientId}, not ${newCustomerId}`,
    );
    process.exit(1);
  }
}

const payResult = await SalesPayments.updateMany(
  { invoiceId },
  { $set: { customerId: newCustomerId } },
);
await SalesInvoices.updateOne({ id: invoiceId }, { $set: { customerId: newCustomerId } });

console.log(
  `Invoice ${invoice.number}: customer ${invoice.customerId} → ${newCustomerId} (${client.companyName})`,
);
console.log(`Payments updated: ${payResult.modifiedCount}`);

await mongoose.disconnect();
