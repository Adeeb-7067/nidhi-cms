import mongoose from "mongoose";
import dotenv from "dotenv";
import { publicViewStatusUpdates } from "../src/utils/sales-proposal-client.js";

dotenv.config();

const number = process.argv[2] ?? "PROP-2026-0006";

await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
const col = mongoose.connection.db.collection("salesproposals");
const proposal = await col.findOne({ number });
if (!proposal) {
  console.error("Proposal not found:", number);
  process.exit(1);
}

const updates = publicViewStatusUpdates(proposal);
if (Object.keys(updates).length === 0) {
  console.log("No updates needed", { number, status: proposal.status });
} else {
  await col.updateOne({ number }, { $set: updates });
  console.log("Updated", number, updates);
}

await mongoose.disconnect();
