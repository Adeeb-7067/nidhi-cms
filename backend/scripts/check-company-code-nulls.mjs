import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });
await mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection.db;
const clients = db.collection("clients");

const nullCode = await clients.countDocuments({ companyCode: null });
const missingCode = await clients.countDocuments({ companyCode: { $exists: false } });
const emptyCode = await clients.countDocuments({ companyCode: "" });
console.log({ nullCode, missingCode, emptyCode, total: await clients.countDocuments() });

const sample = await clients.find({ $or: [{ companyCode: null }, { companyCode: "" }, { companyCode: { $exists: false } }] }).project({ id: 1, companyName: 1, companyCode: 1 }).limit(10).toArray();
console.log("sample:", sample);

await mongoose.disconnect();
