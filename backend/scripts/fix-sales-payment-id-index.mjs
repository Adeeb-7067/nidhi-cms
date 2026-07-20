import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

async function fixIndexes() {
  console.log("[Index Fix] Connecting to MongoDB...");
  const conn = await mongoose.connect(process.env.DATABASE_URL);
  const db = conn.connection.db;

  try {
    await db.collection("financepayments").dropIndex("salesPaymentId_1");
    console.log("[Index Fix] Dropped legacy salesPaymentId_1 index on financepayments.");
  } catch (err) {
    console.log("[Index Fix] financepayments drop index info:", err.message);
  }

  try {
    await db.collection("financeincomes").dropIndex("salesPaymentId_1");
    console.log("[Index Fix] Dropped legacy salesPaymentId_1 index on financeincomes.");
  } catch (err) {
    console.log("[Index Fix] financeincomes drop index info:", err.message);
  }

  await db.collection("financepayments").createIndex(
    { salesPaymentId: 1 },
    {
      unique: true,
      partialFilterExpression: { salesPaymentId: { $type: "number" } },
      background: true,
    }
  );
  console.log("[Index Fix] Created partial unique index on financepayments.");

  await db.collection("financeincomes").createIndex(
    { salesPaymentId: 1 },
    {
      unique: true,
      partialFilterExpression: { salesPaymentId: { $type: "number" } },
      background: true,
    }
  );
  console.log("[Index Fix] Created partial unique index on financeincomes.");

  await mongoose.disconnect();
  console.log("[Index Fix] Done!");
}

fixIndexes().catch((err) => {
  console.error("[Index Fix] Error:", err);
  process.exit(1);
});
