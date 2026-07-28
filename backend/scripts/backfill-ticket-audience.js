/**
 * One-time: set ticket.audience from creator role for tickets missing the field.
 * Run: node --env-file=.env ./scripts/backfill-ticket-audience.js
 */
import "../load-env.js";
import mongoose from "mongoose";
import { usersTable, ticketsTable } from "../src/models/schema/index.js";
import { ticketAudienceFromRole } from "../src/modules/work/services/ticket-support.js";

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongoUri) {
  console.error("Set MONGODB_URI or DATABASE_URL");
  process.exit(1);
}

await mongoose.connect(mongoUri);

const missing = await ticketsTable
  .find({
    $or: [{ audience: { $exists: false } }, { audience: null }],
  })
  .lean();

let updated = 0;
for (const ticket of missing) {
  const creator = await usersTable.findOne({ id: ticket.creatorId }, { role: 1 }).lean();
  const audience = ticketAudienceFromRole(creator?.role ?? "developer");
  await ticketsTable.updateOne({ id: ticket.id }, { $set: { audience } });
  updated += 1;
}

console.log(`Backfilled audience on ${updated} ticket(s).`);
await mongoose.disconnect();
