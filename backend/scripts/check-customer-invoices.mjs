import mongoose from "mongoose";
import { clientsTable, SalesInvoices } from "../src/models/schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

await mongoose.connect(url);
const safe = url.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
console.log("Connected:", safe);

const clients = await clientsTable
  .find({ companyName: { $regex: /lokmudra|roopai/i } })
  .select({ id: 1, companyName: 1, email: 1 })
  .lean();

console.log("\nClients found:", clients.length);
for (const c of clients) {
  const invoices = await SalesInvoices.find({ customerId: c.id })
    .select({ id: 1, number: 1, amount: 1, paidAmount: 1, status: 1, proposalId: 1, installmentId: 1 })
    .lean();
  const totalBilled = invoices.reduce(
    (s, i) => s + (i.status !== "cancelled" ? i.amount : 0),
    0,
  );
  const outstanding = invoices.reduce(
    (s, i) => s + (i.status !== "cancelled" ? Math.max(0, i.amount - i.paidAmount) : 0),
    0,
  );
  console.log(`\n${c.companyName} (id=${c.id}, ${c.email})`);
  console.log(`  totalBilled=₹${totalBilled}, outstanding=₹${outstanding}, invoices=${invoices.length}`);
  for (const inv of invoices) {
    console.log(
      `  - ${inv.number ?? inv.id}: ₹${inv.amount} ${inv.status} paid=₹${inv.paidAmount ?? 0}`,
    );
  }
}

await mongoose.disconnect();
