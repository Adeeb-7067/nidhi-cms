import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { clientsTable, getNextSequence } from "../src/models/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });
await mongoose.connect(process.env.DATABASE_URL);

const id = await getNextSequence("clients");
try {
  await clientsTable.create({
    id,
    companyName: "Null code test",
    contactPerson: "T",
    email: `null-code-test-${Date.now()}@example.com`,
    companyCode: null,
    status: "active",
    customerType: "corporate",
    portalLogin: false,
  });
  console.log("with null: SUCCESS (unexpected)");
} catch (e) {
  console.log("with null: FAIL", e.code, e.keyPattern, e.keyValue?.companyCode);
}

const id2 = await getNextSequence("clients");
try {
  await clientsTable.create({
    id: id2,
    companyName: "Omit code test",
    contactPerson: "T",
    email: `omit-code-test-${Date.now()}@example.com`,
    status: "active",
    customerType: "corporate",
    portalLogin: false,
  });
  console.log("omitted: SUCCESS", id2);
  await clientsTable.deleteOne({ id: id2 });
} catch (e) {
  console.log("omitted: FAIL", e.message);
}

await mongoose.disconnect();
